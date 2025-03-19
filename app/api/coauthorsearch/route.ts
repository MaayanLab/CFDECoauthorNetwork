import neo4j from "neo4j-driver"
import { neo4jDriver } from "@/utils/neo4j"
import { z } from "zod"
import { NextResponse } from "next/server"
import type { NextRequest } from 'next/server'
import { augment_gene_set, kind_mapper, get_node_color_and_type_augmented } from "@/utils/helper"
import { resolve_results, resolve_node_types } from "./helper"
import { fetch_kg_schema } from "@/utils/initialize"
import { initialize } from "../initialize/helper"
import { ArrowShape } from "@/components/Cytoscape"
export interface NetworkSchema {
    nodes: Array<{
        data: {
            id: string,
            kind: string,
            label: string,
			pval?: number,
            [key: string]: string | number | boolean,
        }
    }>,
    edges: Array<{
        data: {
            source: string,
            source_label: string,
            target: string,
            target_label: string,
            kind: string,
            label: string,
			relation?: string,
			directed?: string,
            [key: string]: string | number | boolean,
        }
    }>
}
async function process_query_min_connect_old({
    term, 
    limit,
    aggr_scores, 
    colors,
    extra,
    limit_extra,
    field,
    relation,
    remove
}: {
    term: string | number,
    limit: number,
    limit_extra?: number,
    aggr_scores?: { [key: string]: { max: number, min: number } },
    colors?: { [key: string]: { color?: string, field?: string, aggr_type?: string } },
    field: string,
    extra?: string[],
    relation?: Array<{name?: string, limit?: number, end?: string}>,
    remove?: Array<string>
}) {
    let query_rels = `CALL {`
    let query=``
    let counter_all = 0
    for (const rel of relation) {
	let rela = rel["name"]
    	const lextra = limit_extra
	let extras = extra.filter(item => item !== rela);
    	let query_let = `
    	MATCH (a:Authors {label: $term})-[r1]->(n: \`${rela}\`)-[r2]->(b:Authors)
    	WHERE NOT a.label = b.label
    	WITH COLLECT(DISTINCT b) AS coauthors, a, n
    	UNWIND coauthors AS g
    	MATCH (a)-->(n)-->(g) 
    	WITH a, g, COUNT(*) AS score
    	WHERE score >= TOINTEGER($limit)
    	MATCH p = (a)-[r1]->(n:\`${rela}\`)-[r2]->(g)
    	WITH p, n, a, g
    	`;

    	let with_call = `\tWITH p, n, a, g`;
    	let counter = 1;
    	let ext_counter = 1;
    	let collected_paths = [];
    	for (const extre of relation || []) {
	    let extr = extre["name"]
    	    counter++;
    	    let quer_new = `\tCALL { \n`;
    	    quer_new += with_call + `\n` +
    	        `\t\tOPTIONAL MATCH p${counter} = (n)-[r${counter+1}]-(x:${extr})\n` +
    	        `\t\tRETURN p${counter} AS p_call LIMIT ${lextra}\n\t\tUNION \n`;

    	    counter++;
    	    quer_new += with_call + `\n` +
    	        `\t\tOPTIONAL MATCH p${counter} = (g)-[r${counter+1}]-(x:${extr})\n` +
    	        `\t\tRETURN p${counter} AS p_call LIMIT ${lextra}\n\t\tUNION \n`;

    	    counter++;
    	    quer_new += with_call + `\n` +
    	        `\t\tOPTIONAL MATCH p${counter} = (a)-[r${counter+1}]-(x:${extr})\n` +
    	        `\t\tRETURN p${counter} AS p_call LIMIT ${lextra}\n\t}\n`;

    	    counter++;
    	    if(ext_counter > 1 ){
    	        with_call += `,p${ext_counter}`
    	    }
    	    let prev_with = with_call;
    	    with_call += `,COLLECT(p_call) AS p${ext_counter + 1} \n`;
    	    collected_paths.push(`p${ext_counter + 1}`); // Track collected path
    	    ext_counter++;

    	    quer_new += with_call;
    	    with_call = prev_with;
    	    query_let += quer_new;
    	}
    	let collected_paths_str = collected_paths.join(" + "); // `p2 + p3 + ...`
    	let quer_new_wrap = `
    	WITH 
    	    p, 
    	    [path IN ${collected_paths_str} WHERE path IS NOT NULL | nodes(path)] AS nodes_list,
    	    [path IN ${collected_paths_str} WHERE path IS NOT NULL | relationships(path)] AS rel_list 
    	RETURN
    	    COALESCE(nodes(p), []) + REDUCE(acc=[], x IN nodes_list | acc + x) AS n,
    	    COALESCE(relationships(p), []) + REDUCE(acc=[], x IN rel_list | acc + x) AS r
    	`;
    	let quer_begin = `
    	UNION
    	MATCH (a:Authors {label: $term})-[r1]->(n:\`${rela}\`)-[r2]->(b:Authors)
    	WHERE NOT a.label = b.label
    	WITH COLLECT(DISTINCT b) AS coauthors, a, n
    	UNWIND coauthors AS g
    	MATCH (a)-->(n)-->(g) 
    	WITH a, g, COUNT(*) AS score
    	WHERE score >= TOINTEGER($limit)
    	MATCH p = (a)-[r1]->(n:\`${rela}\`)-[r2]->(g)
    	RETURN nodes(p) as n, relationships(p) as r
    	`;


    	let query = query_let + `\n RETURN p, nodes(p) as n, relationships(p) as r` 
    	if (collected_paths.length !== 0) {
    	     console.log(collected_paths)
    		 query = query_let + quer_new_wrap + quer_begin;
    	}
	counter_all += 1
	if (counter_all != relation.length) {
		query += `\nUnion\n`
	}
	query_rels += query
    }
    query_rels += `} WITH n, r LIMIT(500) `
    if ((remove || []).length) {
		query = query + `
			WHERE NOT n.id in ${JSON.stringify(remove)}
			`
    }
    query_rels += `\n RETURN n, r`
    query=query_rels
    console.log(query)
    const query_params = { term, limit, extra: extra ?? [] };

    return resolve_results({ query, query_params, terms: [term], aggr_scores, colors, fields: [field] });
}


async function process_query_min_connect({
    term, 
    limit,
    aggr_scores, 
    colors,
    extra,
    limit_extra,
    field,
    relation,
    remove
}: {
    term: string | number,
    limit: number,
    limit_extra?: number,
    aggr_scores?: { [key: string]: { max: number, min: number } },
    colors?: { [key: string]: { color?: string, field?: string, aggr_type?: string } },
    field: string,
    extra?: string[],
    relation?: Array<{name?: string, limit?: number, end?: string}>,
    remove?: Array<string>
}) {

    let query= `
    MATCH (a:Authors {label: $term})-[r1]->(n:Publications)-[r2]->(b:Authors)
    WHERE NOT a.label = b.label
    WITH COLLECT(DISTINCT b) AS coauthors, a, n
    UNWIND coauthors AS g
    MATCH (a)-->(n)-->(g) 
    WITH a, g, COUNT(*) AS score
    WHERE score >= TOINTEGER($limit)
    MATCH p = (a)-[r1]->(n:Publications)-[r2]->(g)
    WITH a, COLLECT(DISTINCT(g))[..$limit_extra] as limited
    UNWIND(limited) as g
    MATCH p2 = (a)-[r1:Coauthors]->(g)
    `;
    
    if ((remove || []).length) {
		query = query + `
			WHERE NOT a.id in ${JSON.stringify(remove)}
			AND NOT g.id in ${JSON.stringify(remove)}
			`
    }
    query += `\nRETURN nodes(p2) as n, relationships(p2) as r`
    console.log(query)
    const query_params = { term, limit, limit_extra};

    return resolve_results({ query, query_params, terms: [term], aggr_scores, colors, fields: [field] });
}


const resolve_two_terms = async ({
    edges, 
    start, 
    start_field,
    start_term,
    end,
    end_field,
    end_term,
    limit,
    path_length=4,
    relation,          
    aggr_scores, 
    colors, 
    expand: e, 
    remove, 
    gene_links,
	additional_link_tags,
	arrow_shape
}: {
        edges: Array<string>,
        start: string,
        start_field: string,
        start_term: string | number,
        end: string,
        end_field: string,
        end_term: string | number,
        limit?: number,
        path_length?: number,
        relation?: Array<{name?: string, limit?: number, end?: string}>,
        aggr_scores?: {[key:string]: {max: number, min: number}},
        colors?: {[key: string]: {color?: string, field?: string, aggr_type?: string}},
        expand?: Array<string>,
        remove?: Array<string>,
        gene_links?: Array<string>,
		additional_link_tags?: Array<string>,
		arrow_shape?: {[key: string]: ArrowShape}
})=> {
	let query = `MATCH p=allShortestPaths((a: \`${start}\` {${start_field}: $start_term})-[*..${path_length}]-(b: \`${end}\` {${end_field}: $end_term}))
		USING INDEX a:\`${start}\`(${start_field})
		USING INDEX b:\`${end}\`(${end_field})
		WHERE all(rel in relationships(p) WHERE rel.hidden IS NULL)
	`		
	if (relation) {
		const rels = []
		for (const i of relation) {
			if (edges.indexOf(i.name) === -1) throw {message: `Invalid relationship ${i.name}`}
			rels.push(`\`${i.name}\``)
		}
		if (rels.length > 0) query = query.replace(`[*..${path_length}]`,`[:${rels.join("|")}*..${path_length}]`)
	}
	const vars = {}
	if ((remove || []).length) {
		query = query + `
			AND NOT a.id in ${JSON.stringify(remove)}
			AND NOT b.id in ${JSON.stringify(remove)}
		`
	} 
	const gl = []
	const q = query
	query = query + `RETURN p, nodes(p)[..$limit] as n, relationships(p) as r LIMIT TOINTEGER($limit)`
	if (gene_links.length > 0 || additional_link_tags.length > 0) {
		query = `CALL {
			${query}
		}
		WITH p as q, n as n1, r as r1
		`
		for (const i of gene_links) {
			if (edges.indexOf(i) === -1) throw {message: `Invalid relationship ${i}`}
			gl.push(`\`${i}\``)
		}
		if (gl.length > 0) {
			query = query + `
				CALL {
					WITH q, n1, r1
					RETURN q as p, n1 as n, r1 as r
					UNION
					WITH q
					MATCH p=(c)-[r:${gl.join("|")}]-(d)
					WHERE c in n1 and d in n1
					${additional_link_tags.length > 0 ?
						`AND r.hidden_tag IN ${JSON.stringify(additional_link_tags)}`:
						""
					}
					RETURN p, nodes(p) as n, relationships(p) as r			
				}
				RETURN p, n, r `
		} else if (additional_link_tags.length > 0){
			const node_types = await  resolve_node_types({query: q, query_params: { start_term, end_term, limit, ...vars }})
			query = query + `
				CALL {
					WITH q, n1, r1
					MATCH p=(c:${node_types})-[r]-(d:${node_types})
					WHERE c in n1 and d in n1
					${additional_link_tags.length > 0 ?
						`AND r.hidden_tag IN ${JSON.stringify(additional_link_tags)}`:
						""
					}
					RETURN p, nodes(p) as n, relationships(p) as r			
					UNION
					WITH q, n1, r1
					RETURN q as p, n1 as n, r1 as r
					
				}
				RETURN p, n, r `
		}
	}
	// else {
	// 	query = query + `RETURN q as p, nodes(q) as n, relationships(q) as r LIMIT TOINTEGER($limit)`
	// }
	// remove has precedence on expand
	const expand = (e || []).filter(i=>(remove || []).indexOf(i) === -1)

	if ((expand || []).length) {
		for (const ind in expand) {
			vars[`expand_${ind}`] = expand[ind]
			query = query + `
				UNION
				MATCH p = (c)--(d)
				WHERE c.id = $expand_${ind}
				RETURN p, nodes(p) as n, relationships(p) as r
				LIMIT 10
			`   
		}
	}
	console.log(query)
	const query_params = { start_term, end_term, limit, ...vars }
	return resolve_results({query, query_params, terms: [start_term, end_term],  aggr_scores, colors, fields: [start_field, end_field], arrow_shape})
}

const resolve_term_and_end_type = async (
    {
        edges, 
        start, 
        start_field,
        start_term,
        end,
        limit,
        path_length=4,
        relation,          
        aggr_scores, 
        colors, 
        expand: e, 
        remove, 
        gene_links,
		additional_link_tags,
		arrow_shape
	}: {
            edges: Array<string>,
            start: string,
            start_field: string,
            start_term: string | number,
            end: string,
            limit?: number,
            path_length?: number,
            relation?: Array<{name?: string, limit?: number, end?: string}>,
            aggr_scores?: {[key:string]: {max: number, min: number}},
            colors?: {[key: string]: {color?: string, field?: string, aggr_type?: string}},
            expand?: Array<string>,
            remove?: Array<string>,
            gene_links?: Array<string>,
			additional_link_tags?: Array<string>,
			arrow_shape?: {[key: string]: ArrowShape}
    })=> {
	//${path_length}	
	let query = `MATCH p=allShortestPaths((a: \`${start}\` {${start_field}: $start_term})-[*..${path_length}]-(b: \`${end}\`))
		USING INDEX a:\`${start}\`(${start_field})
		WHERE all(rel in relationships(p) WHERE rel.hidden IS NULL)
	`
	  if (relation) {
		const rels = []
		for (const i of relation) {
			if (edges.indexOf(i.name) === -1) throw {message: `Invalid relationship ${i.name}`}
			rels.push(`\`${i.name}\``)
		}
		if (rels.length > 0) query = query.replace(`[*..${path_length}]`,`[:${rels.join("|")}*..${path_length}]`)
	}
	const vars = {}
	if ((remove || []).length) {
		console.log("REMOVE")
		console.log(remove)
		query = query + `
		        AND all(n in nodes(p) WHERE NOT n.id in ${JSON.stringify(remove)})
			AND NOT a.id in ${JSON.stringify(remove)}
			AND NOT b.id in ${JSON.stringify(remove)}
		`
	} 
	if (start === end) {
		if (query.includes('WHERE')) {
			query = query + `
				AND NOT b.label = $start_term
			`
		} else {
			query = query + `
				WHERE NOT b.label = $start_term
			`
		}
	}
	const q = query
	const gl = []
	query = query + `RETURN p, nodes(p) as n, relationships(p) as r LIMIT TOINTEGER($limit)`
	
	// if (score_fields.length) query = query + `, ${score_fields.join(", ")}`
	// query = `${query} RETURN * ORDER BY rand() LIMIT ${limit}`
    const query_params = { start_term, limit, ...vars }
	console.log(query)
	return resolve_results({query, query_params, terms: [start_term],  aggr_scores, colors, fields:[start_field], arrow_shape})
}


const resolve_one_term = async ({
    edges, 
    start, 
    field,
    term, 
    relation, 
    limit,
    limit_extra,
    path_length=1, 
    aggr_scores, 
    colors, 
    expand: e, 
    remove, 
    gene_links,
	additional_link_tags, 
    augment, 
    augment_limit=10,
	arrow_shape
}: {
        edges: Array<string>,
        start: string,
        field: string,
        term: string | number,
        relation?: Array<{name?: string, limit?: number, end?: string}>,
        limit?: number,
	limit_extra?: number,
        path_length?: number,
        aggr_scores?: {[key:string]: {max: number, min: number}},
        colors?: {[key: string]: {color?: string, field?: string, aggr_type?: string}},
        expand?: Array<string>,
        remove?: Array<string>,
        gene_links?: Array<string>,
		additional_link_tags?: Array<string>,
        augment?: Boolean,
        augment_limit?: number,
		arrow_shape?: {[key: string]: ArrowShape}
    }) => {
	const lextra = limit_extra
	const rels = []
	const valid_relations = []
	const vars = {}
	let default_relation = relation
	if (!default_relation) {
		default_relation = [{ name: 'Publications' }, { name: 'MeSH' }, { name: 'Awards' }]
	}
	console.log(relation)
	if (start == "Authors") {
		if (default_relation) {
			for (const r of default_relation) {
				if (edges.indexOf(r.name) === -1) throw {message: `Invalid relationship ${r.name}`}
				else {
					valid_relations.push(`\`${r.name}\``)
					const color_order = colors[r.name]
					//${r.end? ": " + r.end :""
					let q = `
						MATCH p=(st:\`${start}\` { ${field}: $term })-[r1:\`${r.name}\`*..1]-(en)
						USING INDEX st:\`${start}\`(${field})
						WITH p, st, en
						
					`
					if (color_order.field) {
						q = q + `, REDUCE(acc = 0.0, r in r1 |
							CASE WHEN TYPE(r) = '${r.name}' THEN acc + r.${color_order.field} ELSE acc END) as ${color_order.field}
							ORDER BY  ${color_order.field} ${color_order.aggr_type}	
						`
					}
					q = q + `LIMIT ${r.limit || 5} `
					let to_remove = ``
					if ((remove || []).length) {
						to_remove = `
							WHERE NOT st.id in ${JSON.stringify(remove)}
							AND NOT en.id in ${JSON.stringify(remove)}
						`
						q = q + to_remove
					}
					let u =  q  + `\nCall {\n
								WITH p, st, en
								MATCH p2=(en)-[*..1]-(en2: \`Authors\`)
								\n` + to_remove + `\n
								RETURN p2 AS q, nodes(p2) AS n, relationships(p2) AS r, st as sta LIMIT TOINTEGER($lextra)
								UNION
								WITH p, st, en
								RETURN p as q, nodes(p) as n, relationships(p) as r, st as sta\n
							}
							RETURN n, r, sta
							`



					rels.push(u)
				}
			}
		}
	} else {
		if (default_relation) {
			for (const r of default_relation) {
				if (edges.indexOf(r.name) === -1) throw {message: `Invalid relationship ${r.name}`}
				else {
					valid_relations.push(`\`${r.name}\``)
					const color_order = colors[r.name]
					//${r.end? ": " + r.end :""
					let q = `
						MATCH p=(st:\`${start}\` { ${field}: $term })-[r1:\`${r.name}\`*..1]-(en: \`Authors\`)
						USING INDEX st:\`${start}\`(${field})
						WITH p, st, en
						
					`
					if (color_order.field) {
						q = q + `, REDUCE(acc = 0.0, r in r1 |
							CASE WHEN TYPE(r) = '${r.name}' THEN acc + r.${color_order.field} ELSE acc END) as ${color_order.field}
							ORDER BY  ${color_order.field} ${color_order.aggr_type}	
						`
					}
					q = q + `LIMIT TOINTEGER(${lextra}) `
					let to_remove = ``
					if ((remove || []).length) {
						to_remove = `
							WHERE NOT st.id in ${JSON.stringify(remove)}
							AND NOT en.id in ${JSON.stringify(remove)}
						`
						q = q + to_remove
					}
					q = q + `RETURN nodes(p) as n, relationships(p) as r, st as sta`
					rels.push(q)
				}
			}
		}

	}
	let query = `MATCH p=(st:\`${start}\` { ${field}: $term })-[*1..2]-(en: \`Authors\`) USING INDEX st:\`${start}\`(${field})
		WHERE all(rel in relationships(p) WHERE rel.hidden IS NULL)
	`
	if ((remove || []).length) {
		query= query + `
			AND NOT st.id in ${JSON.stringify(remove)}
			AND NOT en.id in ${JSON.stringify(remove)}
		`
	}
	if (rels.length == 0) {
		limit = 0
	}
	query = query + ` RETURN nodes(p) as n, relationships(p) as r LIMIT TOINTEGER($limit)`
	
	if (rels.length > 0) {
		query = rels.join("\nUNION\n")
		query += `\n UNION \n MATCH ((n:\`${start}\` { ${field}: $term})) RETURN [n] as n, [] as r, [n] as sta`
	}

	const gl = []

    	const query_params = { term, limit, lextra, ...vars }
	// const results = await session.readTransaction(txc => txc.run(query, { term, limit, ...vars }))
	console.log(query)
	return await resolve_results({query, query_params, terms: [term],  aggr_scores, colors, fields: [field], arrow_shape})
}


const input_query_schema = z.object({
    start: z.string(),
    start_field: z.optional(z.string()),
    start_term: z.string().or(z.number()),
    end: z.optional(z.string()),
    end_field: z.optional(z.string()),
    end_term: z.optional(z.string().or(z.number())),
    limit: z.optional(z.number()),
    relation: z.optional(z.array(z.object({
        name: z.string(),
        limit: z.optional(z.number()),
        end: z.optional(z.string())
    }))),
    path_length: z.optional(z.number()),
    remove: z.optional(z.array(z.string())),
    expand: z.optional(z.array(z.string())),
    gene_links: z.optional(z.array(z.string())),
    augment: z.optional(z.boolean()),
    augment_limit: z.optional(z.number()),
	additional_link_tags: z.optional(z.array(z.string())),
    start_extras: z.array(z.string().optional()).optional(),
    limit_extra: z.number().optional(), 
    search_type: z.string().optional()
})

/**
 * @swagger
 * /api/coauthorsearch
 *   get:
 *     description: Performs single or two term search
 *     tags:
 *       - term search
 *     parameters:
 *       - name: filter
 *         in: query
 *         required: true
 *         content:
 *            application/json:
 *              schema: 			
 *                type: object
 *                required:
 *                  - start
 *                  - start_term
 *                properties:
 *                  start:
 *                    type: string
 *                  start_field:
 *                    type: string
 *                    default: label
 *                  start_term:
 *                    type: string
 *                  end:
 *                    type: string
 *                  end_field:
 *                    type: string
 *                  end_term:
 *                    type: string
 *                  relation:
 *                    type: array
 *                    items:
 *                      type: object
 *                      properties:
 *                        name:
 *                          type: string
 *                        limit:
 *                          type: integer
 *                          default: 5
 *                        end:
 *                          type: string
 *                  path_length:
 *                    type: integer
 *                    default: 1
 *                  remove:
 *                    type: array
 *                    items:
 *                      type: string
 *                  expand:
 *                    type: array
 *                    items:
 *                      type: string
 *                  gene_links:
 *                    type: array
 *                    items:
 *                      type: string
 *                  augment:
 *                    type: boolean
 *                    default: false
 *                  augment_limit:
 *                    type: integer
 *                    default: 5
 *     responses:
 *       200:
 *         description: Subnetwork
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nodes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       data:
 *                         type: object
 *                 edges:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       data:
 *                         type: object
 */

export async function GET(req: NextRequest) {
    const schema = await fetch_kg_schema()
    try {
		const f = JSON.parse(req.nextUrl.searchParams.get("filter"))
	const url = new URL(req.nextUrl)
	console.log(url)
	// Parse the existing `filter` parameter
	let filterParam = JSON.parse(url.searchParams.get("filter") || "{}");
	
	// Only add `relation` if it does not already exist
	if (!filterParam.hasOwnProperty("relation")) {
	  filterParam["relation"] = [
	    { name: "Publications" },
	    { name: "MeSH" },
	    { name: "Awards" }
	  ];
	
	  // Convert back to a string and update `searchParams`
	  url.searchParams.set("filter", JSON.stringify(filterParam));
	
	  // Update the browser history without reloading (optional)
	  console.log(url)
	  return NextResponse.redirect(url.toString()); // Redirect with updated URL
	}
	
        if (f.limit && !isNaN(f.limit) && typeof f.limit === 'string') f.limit = parseInt(f.limit)
        const { start,
                start_field="label",
                start_term,
                end,
                end_field="label",
                end_term,
                relation,
                limit=5,
                path_length,
                remove = [],
                expand = [],
                gene_links = [],
                augment,
                augment_limit,
				search_type = "explore", 
				limit_extra = 0,
				start_extras = [],
				additional_link_tags = []
			 } = input_query_schema.parse(f)
        const {aggr_scores, colors, edges, arrow_shape} = await initialize()
        const nodes = schema.nodes.map(i=>i.node)
        if (nodes.indexOf(start) < 0) return NextResponse.json({error: "Invalid start node"}, {status: 400})
        else if (end && nodes.indexOf(end) < 0) return NextResponse.json({error: "Invalid end node"}, {status: 400})
        else { 
            try {
                const session = neo4jDriver.session({
                    defaultAccessMode: neo4j.session.READ
                })
		if (search_type == "explore") {
                	try {
                	    if (start) {
                	        const results = await resolve_one_term({edges, start, field: start_field, term: start_term, relation, limit, limit_extra:limit_extra, path_length, aggr_scores, colors, remove, expand, gene_links, additional_link_tags, augment, augment_limit, arrow_shape })
                	        return NextResponse.json(results, {status: 200})
                	    } else {
                	        return NextResponse.json({error: "Invalid Input"}, {status: 400})
                	    }
                	} catch (e) {
                	    console.log(e.message);
                	    return NextResponse.json(e, {status: 400})
                	} finally {
                	    session.close();
                	}
	    	} else if (search_type == "min_connect") {
			try {
				if (f.limit_extra && !isNaN(f.limit_extra) && typeof f.limit_extra === 'string') f.limit_extra = parseInt(f.limit_extra) 
				const {aggr_scores, colors} = await initialize()
				if (start_term === undefined) return NextResponse.json({error: "No term inputted"}, {status: 400})
				else { 
				    try {
				        const results = await process_query_min_connect({term:start_term, limit, aggr_scores, colors, field:start_field, extra: start_extras, limit_extra:limit_extra, relation: relation, remove: remove? remove: []})
				        return NextResponse.json(results, {status: 200})
				    
				    } catch (e) {
				        return NextResponse.json({error:e.message}, {status: 400})
				    }
				}
			} catch (e) {
				console.log(e.message);
				return NextResponse.json(e, {status:400})
			} finally {
				session.close();
			}
		} else if (search_type == "direct_connect") {
			try {
				if (f.limit_extra && !isNaN(f.limit_extra) && typeof f.limit_extra === 'string') f.limit_extra = parseInt(f.limit_extra)
				let lextra = limit_extra
				if (limit_extra == 0) lextra = 2
				if (start && end && start_term && end_term) {
				    if(augment)  return NextResponse.json({error: "You can only augment on single search"}, {status: 400})
				    console.log("Resolve two term")
				    const results = await resolve_two_terms({edges, start, start_field, start_term, end, end_field, end_term, relation, limit, path_length:lextra, aggr_scores, colors, remove: remove ?  remove: [], expand: expand ? expand : [], gene_links, additional_link_tags, arrow_shape})
				    return NextResponse.json(results, {status: 200})
				} else if (start && end && start_term ) {
			       	    console.log("Term and end type")
			            if(augment)  return NextResponse.json({error: "You can only augment on single search"}, {status: 400})
			            const results = await resolve_term_and_end_type({edges, start_term, start_field, start, end, relation, limit, path_length:lextra, aggr_scores, colors, remove, expand: expand, gene_links, additional_link_tags, arrow_shape})
				    return NextResponse.json(results, {status: 200})
				}
			} catch(e) {
				console.log(e.message);
				return NextResponse.json(e, {status:400})
			} finally{
				session.close();
			}
		} else {
			console.log("none of the above");
			session.close();
		}
	    } catch(error) {
		return NextResponse.json(error, {status:400});
	    }
	} 
} catch(error) {
	return NextResponse.json(error, {status:400});
}
}
