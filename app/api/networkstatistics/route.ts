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

async function process_edge_chart_query({ type }: { type: string }) {
    try {
        const session = neo4jDriver.session({
            defaultAccessMode: neo4j.session.READ
        });
	let query = `MATCH ()-[r]->()
		     RETURN type(r) AS edgeType, COUNT(*) AS count
		     ORDER BY count DESC`


        const results = await session.readTransaction(txc => txc.run(query, {}));
	let edges = results.records.map(result => ({
            label: result.get("edgeType"), // Get label name
            value: result.get("count").low // Extract Neo4j integer count
        }));

        return edges;
    } catch (error) {
        console.log(error);
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
		     
		     RETURN {
		         avg_degree: avg_degree, 
		         min_degree: min_degree, 
		         max_degree: max_degree, 
		         most_connected_node: most_connected_label, 
		         max_connections: max_connections
		     } AS result;`


        const results = await session.readTransaction(txc => txc.run(query, {}));
	let networkStats = results.records.map(record => {
	    const result = record.get("result"); // Extract the result object first
	
	    return {
	        avg_degree: typeof result.avg_degree === "number" ? result.avg_degree : result.avg_degree.toNumber(),
	        min_degree: typeof result.min_degree === "number" ? result.min_degree : result.min_degree.toNumber(),
	        max_degree: typeof result.max_degree === "number" ? result.max_degree : result.max_degree.toNumber(),
	        most_connected_node: result.most_connected_node || result.most_connected_node?.identity?.low,
	        max_connections: typeof result.max_connections === "number" ? result.max_connections : result.max_connections.toNumber()
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
       		const [node_results, edge_results, networkStats_results] = await Promise.all([
       		    process_node_chart_query({ type }),
       		    process_edge_chart_query({ type }),
		    process_stats_query({ type })
       		]);

       		// Combine results into a single object
		console.log(networkStats_results)
       		const results = {
       		    node_results,
       		    edge_results,
		    networkStats_results
       		};
                return NextResponse.json(results, {status: 200})
	} catch (e) {
                return NextResponse.json(e, {status: 400})
        }
    } catch(e) {
	    return NextResponse.json(e, {status:400})
    }
}
  
