import { resolve_results } from "../knowledge_graph/helper";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from 'zod';
import { initialize } from "../initialize/helper";
async function process_query({
    term, 
    limit,
    aggr_scores, 
    colors,
    extra,
    limit_extra,
    field
}: {
    term: string,
    limit: number,
    limit_extra?: number,
    aggr_scores?: { [key: string]: { max: number, min: number } },
    colors?: { [key: string]: { color?: string, field?: string, aggr_type?: string } },
    field: string,
    extra?: string[];
}) {
    const lextra = limit_extra
    let query_let = `
    MATCH (a:Authors {label: $term})-[r1]->(n:Publication)-[r2]->(b:Authors)
    WHERE NOT a.label = b.label
    WITH COLLECT(DISTINCT b) AS coauthors, a, n
    UNWIND coauthors AS g
    MATCH (a)-->(n)-->(g) 
    WITH a, g, COUNT(*) AS score
    WHERE score >= TOINTEGER($limit)
    MATCH p = (a)-[r1]->(n:Publication)-[r2]->(g)
    WITH p, n, a, g
    `;

    let with_call = `\tWITH p, n, a, g`;
    let counter = 1;
    let ext_counter = 1;
    let collected_paths = [];
    for (const extr of extra || []) {
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
    MATCH (a:Authors {label: $term})-[r1]->(n:Publication)-[r2]->(b:Authors)
    WHERE NOT a.label = b.label
    WITH COLLECT(DISTINCT b) AS coauthors, a, n
    UNWIND coauthors AS g
    MATCH (a)-->(n)-->(g) 
    WITH a, g, COUNT(*) AS score
    WHERE score >= TOINTEGER($limit)
    MATCH p = (a)-[r1]->(n:Publication)-[r2]->(g)
    RETURN nodes(p) as n, relationships(p) as r
    `;


    console.log(query_let + quer_new_wrap + quer_begin);
    
    const query = query_let + quer_new_wrap + quer_begin;
    const query_params = { term, limit, extra: extra ?? [] };

    return resolve_results({ query, query_params, terms: [term], aggr_scores, colors, fields: [field] });
}

//async function process_query({
//    term, 
//    limit,
//    aggr_scores, 
//    colors,
//    extra,
//    field }: {
//        term: string,
//        limit: number,
//        aggr_scores?: {[key:string]: {max: number, min: number}},
//        colors?: {[key: string]: {color?: string, field?: string, aggr_type?: string}},
//        field: string,
//	extra?: string[]; 
//    }) {
//
//    let query_let = `
//    MATCH p1 = (a:Authors {label: $term})-[r1]->(n:Publication)-[r2]->(b:Authors)
//    WHERE NOT a.label= b.label
//    UNWIND b as coauthors
//    WITH DISTINCT(coauthors) as g, a, n
//    MATCH q=(a)-->(n)-->(g) 
//    WITH a, g, COUNT(q) as score
//    WHERE score >= TOINTEGER($limit)
//    MATCH p = (a)-[r1]->(n:Publication)-[r2]->(g)
//    WITH p, n, a, g
//
//    `
//
//    let with_call = `\tWITH p, n, a, g\n`;
//    let counter = 1;
//    let ext_counter = 1;
//    
//    for (const extr of extra) {
//        counter++;
//        let quer_new = `\tCALL { \n`;
//        quer_new += with_call +
//            `\t\tOPTIONAL MATCH p${counter} = (n)-[r${counter+1}]-(x:${extr})\n` +
//            `\t\tRETURN p${counter} AS p_call LIMIT 1\n\t\tUNION \n`;
//    
//        counter++;
//        quer_new += with_call +
//            `\t\tOPTIONAL MATCH p${counter} = (g)-[r${counter+1}]-(x:${extr})\n` +
//            `\t\tRETURN p${counter} AS p_call LIMIT 1\n\t\tUNION \n`;
//    
//        counter++;
//        quer_new += with_call +
//            `\t\tOPTIONAL MATCH p${counter} = (a)-[r${counter+1}]-(x:${extr})\n` +
//            `\t\tRETURN p${counter} AS p_call LIMIT 1\n\t}\n`;
//    
//        counter++;
//        
//        let prev_with = with_call;
//        with_call += `COLLECT(p_call) AS p${ext_counter + 1}\n`;
//        ext_counter++;
//    
//        quer_new += with_call;
//        with_call = prev_with;
//        query_let += quer_new;
//    }
//    
//    let quer_new_wrap = `
//    WITH 
//        p, 
//        [path IN p2 WHERE path IS NOT NULL | nodes(path)] AS nodes_list,
//        [path IN p2 WHERE path IS NOT NULL | relationships(path)] AS rel_list 
//    RETURN
//        COALESCE(nodes(p), []) + REDUCE(acc=[], x IN nodes_list | acc + x) AS n,
//        COALESCE(relationships(p), []) + REDUCE(acc=[], x IN rel_list | acc + x) AS r
//    `;
//    
//    console.log(query_let + quer_new_wrap);
//    
//    const query = query_let + quer_new_wrap;
//    const query_params = { term, limit, extra: extra ?? [] };
//    
//    return resolve_results({ query, query_params, terms: [term], aggr_scores, colors, fields: [field] });
//
//   // let with_call = `\t\t WITH p, n, a, g\n`
//   // let counter = 1
//   // let ext_counter = 1
//   // for (const extr of extra) {
//   //        counter++;
//   //        let end_with = ``
//   //        let quer_new = `\t CALL { \n`
//   //        quer_new += with_call +
//   //     	   `\t\t OPTIONAL MATCH p${counter} = (n) - [r${counter+1}]-(x) WHERE x:${extr} \n` +
//   //     	   `\t\t RETURN p${counter} as p_call LIMIT(1)\n \t\t UNION \n`
//   //        
//   //        counter++;
//   //        quer_new += with_call + `\n`+
//   //     	   `\t\t OPTIONAL MATCH p${counter} = (g) - [r${counter+1}]-(x) WHERE x:${extr} \n` +
//   //     	   `\t\t RETURN p${counter} as p_call LIMIT(1)\n \t\t UNION \n`
//   //        counter++;
//
//   //        quer_new += with_call + `\n`+
//   //     	   `\t\t OPTIONAL MATCH p${counter} = (a) - [r${counter+1}]-(x) WHERE x:${extr} \n` +
//   //     	   `\t\t RETURN p${counter} as p_call LIMIT(1)\n\t}\n`
//   //        counter++;
//   //        
//   //        for ( let i = 2; i < ext_counter + 1; i++) {
//   //        	with_call += `p${i}`
//   //        }
//   //        let prev_with = with_call
//   //        with_call += `collect(p_call) as p${ext_counter + 1}`
//   //        ext_counter++;
//   //        quer_new += with_call
//   //        with_call = prev_with
//   //        query_let += quer_new
//   // }
//   // let quer_new_wrap =
//   //         `\t WITH \n` +
//   //         `\t\t p, \n \t\t [path in p2 WHERE path IS NOT NULL | nodes(path)] as nodes_list,\n` +
//   //         `\t\t [path IN p2 WHERE path IS NOT NULL | relationships(path)] as rel_list \n` +
//   //         `\t RETURN\n` +
//   //         `	\t\t COALESCE(nodes(p), []) + REDUCE(acc=[], x IN nodes_list | acc + x) as n,\n` +
//   //         `   \t\t COALESCE(relationships(p), []) + REDUCE(acc=[], x IN rel_list | acc + x) AS r`
//   // console.log(query_let + quer_new_wrap)
//   // const query = query_let + quer_new_wrap
//   // const query_params = { term, limit, extra: extra ?? []}
//   // return resolve_results({query, query_params, terms: [term],  aggr_scores, colors, fields: [field]})
//}

const InputSchema = z.object({
    start_term: z.string(),
    limit: z.number().optional(),
    start_field: z.string().optional(),
    start_extras: z.array(z.string().optional()).optional(),
    limit_extra: z.number().optional()
})


/**
 * @swagger
 * /api/distillery/mw:
 *   get:
 *     description: Resolves MW usecase
 *     tags:
 *       - distillery apps
 *     parameters:
 *       - name: filter
 *         in: query
 *         required: true
 *         content:
 *            application/json:
 *              schema: 			
 *                type: object
 *                required:
 *                  - start_term
 *                properties:
 *                  start_field:
 *                    type: string
 *                  start_term:
 *                    type: string
 *                  limit:
 *                    type: integer
 *                    default: 5
 *                  start_extras:
 *                    type: string array
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
    const filter = req.nextUrl.searchParams.get("filter")
    if (!filter) return NextResponse.json({error: "No filter inputted"}, {status: 400})
    const f = JSON.parse(filter)
    if (f.limit && !isNaN(f.limit) && typeof f.limit === 'string') f.limit = parseInt(f.limit)
    if (f.limit_extra && !isNaN(f.limit_extra) && typeof f.limit_extra === 'string') f.limit_extra = parseInt(f.limit_extra) 
    const { start_term, limit=10, start_field="label", start_extras, limit_extra=0} = InputSchema.parse(f)
    console.log("START EXTRAS")
    console.log(start_extras)
    const {aggr_scores, colors} = await initialize()
    // const nodes = schema.nodes.map(i=>i.node)
    if (start_term === undefined) return NextResponse.json({error: "No term inputted"}, {status: 400})
    else { 
        try {
            const results = await process_query({term:start_term, limit, aggr_scores, colors, field:start_field, extra: start_extras, limit_extra:limit_extra})
            return NextResponse.json(results, {status: 200})
        
        } catch (e) {
            return NextResponse.json({error:e.message}, {status: 400})
        }
      }
  }
  
