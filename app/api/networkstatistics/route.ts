import neo4j from "neo4j-driver"
import { neo4jDriver } from "@/utils/neo4j"
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from 'zod';
import { ArrowShape } from "@/components/Cytoscape";
async function process_node_chart_query({ type }: { type: string }) {
    try {
        const session = neo4jDriver.session({
            defaultAccessMode: neo4j.session.READ
        });

        let query = `MATCH (n)
                     UNWIND labels(n) AS label
                     RETURN label, COUNT(*) AS count
                     ORDER BY count DESC`;

        const results = await session.readTransaction(txc => txc.run(query, {}));
	let nodes = results.records.map(result => ({
            label: result.get("label"), // Get label name
            value: result.get("count").low // Extract Neo4j integer count
        }));

        return nodes;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function process_node_degrees_query({ type }: { type: string }) {
    try {
        const session = neo4jDriver.session({
            defaultAccessMode: neo4j.session.READ
        });

        let query = `
		MATCH (n:Authors)-[r]-()
		WITH type(r) AS relationType, COUNT(r) * 1.0 / COUNT(DISTINCT n) AS avgDegree
		RETURN relationType, avgDegree
		ORDER BY avgDegree DESC;
        `;

        const results = await session.readTransaction(txc => txc.run(query, {}));
        let nodes = results.records.map(result => ({
            label: result.get("relationType"), // Get node label (type)
            avgDegree: result.get("avgDegree") // Get average degree
        }));

        return nodes;
    } catch (error) {
        console.error("Error fetching average node degree:", error);
        throw error;
    }
}

async function process_edge_chart_query({ type }: { type: string }) {
    try {
        const session = neo4jDriver.session({
            defaultAccessMode: neo4j.session.READ
        });
	let query = `MATCH (start)-[r]->(end)
                     RETURN type(r) AS edgeType, labels(start)[0] AS startType, labels(end)[0] AS endType, COUNT(*) AS count
                     ORDER BY count DESC`

        const results = await session.readTransaction(txc => txc.run(query, {}));
	let edges = results.records.map(result => {
	    let startType = result.get("startType");
	    let endType = result.get("endType");
	    let edgeType = result.get("edgeType");
	    
	    return {
	        label: edgeType + " : " + startType + "↔" + endType, // Correct label format
	        value: (startType !== endType) ? result.get("count").low : result.get("count").low / 2 // Fix halving condition

	    };
	});

	edges = edges.filter(edge => {
		let edgeType = edge.label.split(" : ")[0]
		let parts = edge.label.split(" : ")[1].split("↔");
		let startType = parts[0]
		let endType = parts[1]

		if (startType === endType) {
			return true;
		} else {
			if (startType === edgeType) {
				return true;
			} else {
				return false;
			}
		}

	})
	return edges;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function process_top_nodes({ type }: {type: string}) {
    try {
    	const session = neo4jDriver.session({
		defaultAccessMode: neo4j.session.READ
	});
	let query = `
		MATCH (n)-[]->(m)
		WITH n, labels(n) AS nodeType, labels(m) AS connectedNodeType, COUNT(*) AS count
		ORDER BY nodeType, count DESC
		WITH nodeType, ID(n) AS topNodeId, n AS topNode, collect({nodeType: connectedNodeType, count: count}) AS relationshipCounts
		RETURN nodeType, topNodeId, topNode, relationshipCounts
	`;
	//let query = `
	//	MATCH (n)-[]->(m)
	//	WITH labels(n) AS nodeType, n, labels(m) AS connectedNodeType, COUNT(*) AS count
	//	ORDER BY nodeType, count DESC
	//	WITH nodeType, n, collect({nodeType: connectedNodeType, count: count}) AS connections
	//	WITH nodeType, collect({node: n, connections: connections}) AS topNodes
	//	UNWIND topNodes AS node
	//	RETURN nodeType, node.node AS topNode, node.connections AS relationshipCounts
	//`;
	//let query = `
        //   MATCH (n)-[r]->()
        //    WITH labels(n) AS nodeType, n, type(r) AS relType, COUNT(*) AS relCount
        //    ORDER BY nodeType, relCount DESC
        //    WITH nodeType, n, collect({relation: relType, count: relCount}) AS relations
        //    WITH nodeType, collect({node: n, relations: relations})[0..100] AS topNodes
        //    UNWIND topNodes AS node
        //    RETURN nodeType, node.node AS topNode, node.relations AS relationshipCounts`
        //let query = `
        //    MATCH (n)
        //    WITH labels(n) AS nodeType, n, 
        //         COUNT { (n)-->() } + COUNT { (n)<--() } AS degree
        //    ORDER BY nodeType, degree DESC
        //    WITH nodeType, collect({node: n, degree: degree})[0..100] AS topNodes
        //    UNWIND topNodes AS node
        //    RETURN nodeType, node.node AS topNode, node.degree AS relationshipCount
        //`;

        const results = await session.readTransaction(txc => txc.run(query, {}));
        
        let nodes = results.records.map(result => ({
            label: result.get("nodeType"), // Node label (type)
            topNode: result.get("topNode").properties.label, // Node properties
            relationshipCount: result.get("relationshipCounts") || [], // Relationship count
	    topNodeId: result.get("topNodeId")
        }));

	return nodes;
    } catch (error) {
	console.log(error)
    	throw error;
    }
}


async function process_stats_query({type}: {type: string}) {	
    try {
        const session = neo4jDriver.session({
            defaultAccessMode: neo4j.session.READ
        });
	let query = `CALL {
		     MATCH (n)
		     WITH n, COUNT { (n)--() } AS degree
		     RETURN avg(degree) AS avg_degree, 
		            min(degree) AS min_degree, 
		            max(degree) AS max_degree
		     } 
		     
		     CALL {
		         MATCH (n)
		         WITH n, COUNT { (n)--() } AS degree
		         ORDER BY degree DESC
		         LIMIT 1
		         RETURN n AS most_connected_node, n.label AS most_connected_label, degree AS max_connections
		     }

		     CALL {
			 MATCH (n)--(m)
			 WITH n, m, COUNT { (n)--() } AS deg_n, COUNT { (m)--() } AS deg_m
			 WITH avg(deg_n * deg_m) AS num, avg(deg_n) AS avg_n, avg(deg_m) AS avg_m,
			      stdev(deg_n) AS std_n, stdev(deg_m) AS std_m
			 RETURN (num - avg_n * avg_m) / (std_n * std_m) AS assortativity
		     }

		     CALL {
			 MATCH (n)
			 WITH n, COUNT { (n)--() } AS degree
			 RETURN stdev(degree) AS degree_std_dev
		     }
		     
		     CALL {
			     MATCH (n)
			     WITH count(n) AS num_nodes
			     MATCH ()-->()
			     WITH num_nodes, count(*) AS num_edges
			     RETURN num_edges, num_edges * 1.0 / (num_nodes * (num_nodes - 1)) AS density
		     }

		     
		     RETURN {
		         avg_degree: avg_degree,
			 std_dev_degree: degree_std_dev,
		         min_degree: min_degree, 
		         max_degree: max_degree,
			 assortativity: assortativity,
			 network_density: density,
		         most_connected_node: most_connected_label 
		     } AS result;`


        const results = await session.readTransaction(txc => txc.run(query, {}));
	let networkStats = results.records.map(record => {
	    const result = record.get("result"); // Extract the result object first
	
	    return {
	        avg_degree: typeof result.avg_degree === "number" ? result.avg_degree : result.avg_degree.toNumber(),
			std_dev_degree: typeof result.std_dev_degree === "number" ? result.std_dev_degree : result.std_dev_Degree.toNumber(),
	        min_degree: typeof result.min_degree === "number" ? result.min_degree : result.min_degree.toNumber(),
	        max_degree: typeof result.max_degree === "number" ? result.max_degree : result.max_degree.toNumber(),
	        assortativity: typeof result.assortativity === "number" ? result.assortativity : result.assortativity.toNumber(),
	        network_density: typeof result.network_density === "number" ? result.network_density : result.network_density.toNumber(),
	        most_connected_node: result.most_connected_node || result.most_connected_node?.identity?.low
	    };
	});

        return networkStats;
    } catch (error) {
        console.log(error);
        throw error;
    }

}
const InputSchema = z.object({
    type: z.string()
})
/**
 * @swagger
 * /api/distillery/tissue2drugs:
 *   get:
 *     description: Performs tissue2drugs use case
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
 *                  - start
 *                  - start_term
 *                properties:
 *                  start:
 *                    type: string
 *                  start_field:
 *                    type: string
 *                  start_term:
 *                    type: string
 *                  limit:
 *                    type: integer
 *                    default: 5
 *                  relation:
 *                    type: array
 *                    items:
 *                      type: string
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
    try {
	const session = neo4jDriver.session({
                    defaultAccessMode: neo4j.session.READ
                })
        const type = req.nextUrl.searchParams.get("type")
        if (!type) return NextResponse.json({error: "No type inputted"}, {status: 400})
        
        try {
                        // Run both queries in parallel
       		const [node_results, edge_results, networkDegree_results, networkStats_results, topNodes_results] = await Promise.all([
       		    		process_node_chart_query({ type }),
       		   		process_edge_chart_query({ type }),
				process_node_degrees_query({ type }),
				process_stats_query({ type }),
				process_top_nodes({ type })
       		]);

       		// Combine results into a single object
       		const results = {
       		    node_results,
       		    edge_results,
		    networkDegree_results,
		    networkStats_results,
		    topNodes_results
       		};
                return NextResponse.json(results, {status: 200})
	} catch (e) {
                return NextResponse.json(e, {status: 400})
        }
    } catch(e) {
	    return NextResponse.json(e, {status:400})
    }
}
  
