import dynamic from "next/dynamic"
import { FilterSchema } from "@/utils/helper"
import { process_relation } from "@/utils/helper"
// import ClientTermAndGeneSearch from './client_side'
import { Grid, Typography, CircularProgress, Card, CardContent, Stack, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, 
	Box} from "@mui/material"
import { styled } from "@mui/system";
import { parseAsJson } from "next-usequerystate"
import AsyncFormComponent from "./async_form"
import AsyncFormComponent_Coauthor from "./async_form_author"
import AsyncFormComponent_Minimum from "./async_form_min"
import AsyncFormComponent_Direct from "./async_form_direct"
import TooltipComponentGroup from "./tooltip"
import Form from "./form"
import NetworkTable from "./network_table"
import { fetch_kg_schema } from "@/utils/initialize"
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';




const Cytoscape = dynamic(()=>import('../Cytoscape'),
    {
        ssr: false,
        loading: ()=><CircularProgress/>
    }
)
export const initialize_example = async () => {
    	const controller = new AbortController()
	const query = {
	    search_type:"explore",
	    type:"Authors"
	}
	const query_str = Object.entries(query).map(([k,v])=>(`${k}=${v}`)).join("&")
	const res = await fetch(`${process.env.NODE_ENV==="development" ? process.env.NEXT_PUBLIC_HOST_DEV : process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX ? process.env.NEXT_PUBLIC_PREFIX: ''}/api/coauthorsearch/node_search/example/${query_str ? "?" + query_str : ""}`, {
		    method: 'GET',
		    signal: controller.signal
		})
	let choices = {}
	if (res.ok) choices = await (res).json()
	return 	{
		  'Deanne M Taylor': {
		    label: 'Deanne M Taylor',
		  },
		}
	
	
}
export const initialize_kg = async () => {
    const schema = await fetch_kg_schema()
    const nodes = {}
	const tooltip_templates_nodes = {}
  	const tooltip_templates_edges = {}
    const edges = []
    const default_relations = []
    const hiddenLinksRelations = []
	for (const i of schema.nodes) {
		tooltip_templates_nodes[i.node] = i.display
		const {node} = i
		nodes[node] = i
	}
    for (const i of schema.edges) {
        for (const e of i.match) {
            tooltip_templates_edges[e] = i.display
            if (!i["gene_link"]) {
                if (edges.indexOf(e) === -1) {
                    edges.push(e)
                } 
                if (i.selected && default_relations.indexOf(e) === -1) {
                    default_relations.push(e)
                }
            } else if (hiddenLinksRelations.indexOf(e) === -1) {
                for (const j of i.match) hiddenLinksRelations.push(j)
            }
        }
    }
    return {
        schema,
        nodes,
        tooltip_templates_nodes,
        tooltip_templates_edges,
        edges,
        hiddenLinksRelations,
        default_relations,
    }
}

const TermAndGeneSearch = async ({searchParams, props}: {
        searchParams?: {
            filter?: string,
            fullscreen?: 'true',
            view?:string,
	    tooltip?: 'true'
        },
        props: {
            title?: string
            description?: string,
            initial_query?: {
                start: string,
                start_term: string,
                start_field?: string,
                [key: string]: string
            },
            coexpression_prediction?: boolean,
            additional_link_button?: boolean,
            additional_link_relation_tags?: Array<string>,
            neighborCount?: number,
	    extras?: Array<string>
        }
}) => {
    const {
        schema,
        nodes,
        tooltip_templates_nodes,
        tooltip_templates_edges,
        edges,
        hiddenLinksRelations,
	default_relations
    } = await initialize_kg()
    const extras_lis = props.extras
    const choices: {[key:string]: any} = await initialize_example()
    props.initial_query.start_term = Object.values(choices)[0].label || ''
    const query_parser = parseAsJson<FilterSchema>().withDefault(props.initial_query)
    const filter: FilterSchema = query_parser.parseServerSide(searchParams.filter)
    const controller = new AbortController()
    try {
	    if (!filter.search_type) {
		    filter.search_type = "explore"
	    }
    } catch(error) {
        console.error(error)
    }
    try {
        if (filter.relation) {
	    console.log(filter.relation)
            filter.relation = process_relation(filter.relation)
	    console.log("FILTER RELATION IS NOT EMPTY")
	    if (filter.relation == null) {
		    console.log("FILTER RELATION ISEMPTY")
		    filter.relation = [
		    	{"name":"Publications"},
			{"name":"MeSH"},
			{"name":"Awards"}
		    ]
	    }
        } else {
		console.log(filter.relation)
		console.log("SANITY CHECK")
		if (filter.relation == null) {
		    console.log("FILTER RELATION ISEMPTY")
		    filter.relation = [
		    	{"name":"Publications"},
			{"name":"MeSH"},
			{"name":"Awards"}
		    ]
	
		}
	}
	console.log(filter.relation)
        let elements = null
        let relabled_elements = null
        const selected_edges = []
        const genes = []
        if (Object.keys(filter).length > 0) {
            console.log(`${process.env.NODE_ENV==="development" ? process.env.NEXT_PUBLIC_HOST_DEV : process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX ? process.env.NEXT_PUBLIC_PREFIX: ''}/api/coauthorsearch?filter=${JSON.stringify(filter)}`)
            const res = await fetch(`${process.env.NODE_ENV==="development" ? process.env.NEXT_PUBLIC_HOST_DEV : process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX ? process.env.NEXT_PUBLIC_PREFIX: ''}/api/coauthorsearch?filter=${JSON.stringify(filter)}`,
            {
                method: 'GET',
                signal: controller.signal,
            }) 
            if (!res.ok) console.log(await res.text())
            else elements = await res.json()
            relabled_elements = elements        
            relabled_elements.nodes = relabled_elements.nodes.map(node => {
		    if (node.data.kind === "Publications") {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            label: "PMID: " + node.data.label
                        }
                    };
                }
                return node;
            });

            for (const i of (elements || {}).edges || []) {
                if (i.data.relation && selected_edges.indexOf(i.data.label) === -1) {
                    selected_edges.push({name: i.data.label})
                }
            }
            for (const i of (elements || {}).nodes || []) {
                if (i.data.kind === "Gene" && genes.indexOf(i.data.label) === -1) {
                    genes.push(i.data.label)
                }
            }
        }
        // if (!filter.relation || filter.relation.length === 0) {
        //     filter.relation = selected_edges
        // }
         

        return (
            <Grid container spacing={2}>
                {props.title && <Grid item xs={12}>
                    <Typography variant={"h2"}>{props.title}</Typography>
                </Grid>}
                {props.description && <Grid item xs={12}>
                    <Typography variant={"subtitle1"}>{props.description}</Typography>
                </Grid>}
		{(filter.search_type == "explore") && (
		    <Grid item xs={12}>
		    <Typography variant={"subtitle1"}><b>Single Author Search: </b> This search finds related nodes based on the search term. If you search for a publication, it returns all connected authors. If you search for an author, it finds all directly connected nodes, and co-authors by adjusting the sliders.</Typography>
		    </Grid>
		)}

		{(filter.search_type == "min_connect") && (
		    <Grid item xs={12}>
		    <Typography variant={"subtitle1"}><b>Just Author Search: </b> This search finds other coauthors that share a minimum amount of publications. For example, if the limit slider is set to 10, then all appearing co-authors share at least 10 publications with the search authors.  </Typography>
		    </Grid>
		)}
		{(filter.search_type == "direct_connect") && (
		    <Grid item xs={12}>
		    <Typography variant={"subtitle1"}><b>Two Author Search: </b> This search finds paths to other nodes in the Co-Authorship network. </Typography>
		    </Grid>
		)}
                <Grid item xs={12} md={4} lg={3}>
                    <Card elevation={4} sx={{borderRadius: "8px", backgroundColor: "tertiary.light"}}>
                        <CardContent>
                            <Stack>
			    	
			    	{(filter.search_type == "explore") && (
			    		<AsyncFormComponent_Coauthor 
                                	    nodes={nodes}
                                	    initial_query={props.initial_query}
                                	    direction={'Start'}
                                	    searchParams={searchParams}
					    extras={extras_lis}
					    example={choices}/>)}
    
				
				{(filter.search_type == "min_connect") && 
					<AsyncFormComponent_Minimum
						nodes={nodes}
						initial_query={props.initial_query}
						searchParams={searchParams}
						extras={extras_lis}
						example={choices}
					/>
				}

				{(filter.search_type == "direct_connect") && ( 
					<AsyncFormComponent_Direct
						direction={'Start'}
						nodes={nodes}
						initial_query={props.initial_query}
						searchParams={searchParams}
						example={choices}
					/>
				)}
				{(filter.search_type == "direct_connect") && (
				<AsyncFormComponent_Direct
					direction={'End'}
					nodes={nodes}
					initial_query={props.initial_query}
					searchParams={searchParams}
					example={choices}
				/>)}


                            </Stack>
                        </CardContent>
                    </Card>
		    		    <Box sx= {{minHeight: 120, width:"100%",justifyContent:"center"}}>
                    <TooltipComponentGroup
			elements={elements}
			tooltip_templates_edges={tooltip_templates_edges}
			tooltip_templates_nodes={tooltip_templates_nodes}
			schema={schema}
			rel={filter.relation}
			filter={JSON.stringify(filter)}
			/> </Box>

                </Grid>
                <Grid item xs={12} md={8} lg={9}>
                    <Stack>
                        <Form searchParams={searchParams}
                            edges={edges}
                            genes={genes}
                            coexpression_prediction={props.coexpression_prediction}
                            additional_link_button={props.additional_link_button}
                            additional_link_relation_tags={props.additional_link_relation_tags}
                            neighborCount={props.neighborCount}
                            hiddenLinksRelations={hiddenLinksRelations}
                            elements={elements}
                            initial_query={props.initial_query}
                        />
                        <Card sx={{borderRadius: "24px", gap: 2}}>
                            <CardContent>
                            {(searchParams.view === "table") ? 
                                <div style={{minHeight: 700}}><NetworkTable data={elements} schema={schema}/></div>:
                                <Cytoscape 
                                    elements={relabled_elements}
                                    schema={schema}
                                    tooltip_templates_edges={tooltip_templates_edges}
                                    tooltip_templates_nodes={tooltip_templates_nodes}
                                /> 
                            }
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>
        )
    } catch (error) {
        console.error(error)
        return null
    }
}

//<Accordion sx = {{ borderRadius: "8px", backgroundColor: "tertiary.dark", gap: 1, mt: 2}}>
//  <AccordionSummary id="panel-header" aria-controls="panel-content" expandIcon={<ExpandMoreIcon />}>
//  Search Type Info 
  //  </AccordionSummary>
//  <AccordionDetails>This search allows for easy visualization of the most shared connections. By changing the min connections
//slider, one can easily change the minimum shared relations to appear on the graph and find top collaborators or similar authors. Additionally,
//changing the extra nodes slider extends the existing search to find other terms related to the top shared connections. 
//  </AccordionDetails>
//</Accordion> -->
export default TermAndGeneSearch
