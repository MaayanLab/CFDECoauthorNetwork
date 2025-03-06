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
       		const [node_results, edge_results, networkStats_results] = await Promise.all([
       		    process_node_chart_query({ type }),
       		    process_edge_chart_query({ type }),
		    process_stats_query({ type })
       		]);

       		// Combine results into a single object
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
  
