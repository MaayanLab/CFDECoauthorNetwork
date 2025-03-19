'use client'
import { useEffect, useState } from "react"
import AsyncFormComponent from "./async_form"
import { router_push } from "@/utils/client_side"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Stack, 
	Typography, 
	Card, 
	CardContent, 
	CardActions, 
	Button, 
	IconButton,
	Tooltip
 } from "@mui/material"
import { NetworkSchema } from "@/app/api/knowledge_graph/route"
import { useQueryState, parseAsJson } from 'next-usequerystate';
import { makeTemplate } from "@/utils/helper"
import { precise } from "@/utils/math"
import HubIcon from '@mui/icons-material/Hub';
import { UISchema } from "@/app/api/schema/route"
import Link from "next/link"
import DeleteIcon from '@mui/icons-material/Delete';
export const TooltipComponent = ({data, float, tooltip_templates, schema, rel, filter}: {
	data: {
		id: string,
		label?: string,
		relation?: string,
		kind: string,
		[key: string]: string | number
	},
	tooltip_templates: {[key: string]: Array<{[key: string]: string}>}, 
	schema: UISchema,
	float?: boolean,
	rel?: string| Array<string | {name?: string, limit?: string}>,
	filter?: string

}) => {
	const rela = rel

    	const filta = filter&& filter!== '{}' ? JSON.parse(filter|| '{}'): {}
	
	let expand_filta = {
		start: data.kind,
		start_field: filta.start_field, 
		start_term: data.label,
		search_type: filta.search_type,
		relation: rela,
		limit: filta.limit ?? 5,
		limit_extra: filta.limit_extra ?? 5
		}
	
	let expand_filter = ""
	if (data.kind == "Publications") {
		console.log("EXPAND FILTER")
		if (expand_filta) {
			console.log("EXPAND FILTER 2")
			expand_filta.start_term = expand_filta.start_term.split(": ")[1] || ""
		}
	} 
	expand_filter = JSON.stringify(expand_filta)
	console.log(expand_filter)

	if (filta.search_type == "direct_connect") {
		expand_filter = JSON.stringify({
			start: data.kind,
			start_field: filta.start_field, 
			start_term: data.label,
			search_type: filta.search_type,
			relation: rela,
			end:"Authors"
		})
	}
	const searchParams = useSearchParams()
	const pathname = usePathname()
	const queryParams = {}
	let filter_field = 'filter'

	const router = useRouter()
	const elements = []
	const field = data.kind === "Relation" ? data.label : data.kind.replace("Co-expressed Gene", "lncRNA")
	if (field !== "Publications") {
		for (const i of tooltip_templates[field] || []) {
			if (i.type === "link") {
					
				const text = makeTemplate(i.text, data)
				let href = makeTemplate(i.href, data)
				if (text !== 'undefined') {
				  elements.push(
					<Typography key={i.label} variant="subtitle2" sx={{wordWrap: "break-word"}}>
					  <b>{i.label}:</b> <Button size='small' 
						color="secondary"
						  sx={{padding: 0, textDecoration: "underline"}} 
						  href={href}
										  target="_blank"
										  rel="noopener noreferrer"
					  >{text}</Button>
					</Typography>  
				  )
				}
			  } else {
				let e = makeTemplate(i.text, data)
				let key_lab = i.label
				if (i.label === "label") {
					key_lab = data.kind
				}
				if (e !== 'undefined') {
				  elements.push(
					<Typography key={i.label} sx={{wordWrap: "break-word"}} variant="subtitle2">
					  <b>{key_lab}:</b> {i.type === "text" ? e: precise(e)}
					</Typography>  
				  )
				}
			  }
		} 
	} else { 
		let pmid = tooltip_templates["label"]
		for (const i of tooltip_templates[field] || []) {
			if (i.label === "label") {
				continue
			}
			if (i.type === "link") {
				let text = makeTemplate(i.text, data)
				text = text.split(":")[1]
				let href = makeTemplate(i.href, data)
				href = href.replace("PMID: ", "")	
				if (text !== 'undefined') {
				  elements.push(
					<Typography key={"URL"} variant="subtitle2" sx={{wordWrap: "break-word"}}>
					  <b>{"PMID"}:</b> <Button size='small' 
						color="secondary"
						  sx={{padding: 0, textDecoration: "underline"}} 
						  href={href}
										  target="_blank"
										  rel="noopener noreferrer"
					  >{text}</Button>
					</Typography>  
				  )
				}
			  } else {
				let e = makeTemplate(i.text, data)
				let key_lab = i.label
				if (i.label === "label") {
					key_lab = data.kind
				}
				if (e !== 'undefined') {
				  console.log(e)
				  elements.push(
					<Typography key={i.label} sx={{wordWrap: "break-word"}} variant="subtitle2">
					  <b>{key_lab}:</b> {i.type === "text" ? e: precise(e)}
					</Typography>  
				  )
				}
			  }
		} 

	}
	const extrasx = {}
	if (float) {
		extrasx["position"] = "absolute"
		extrasx["top"] = 0
		extrasx["left"] = 0
		extrasx["zIndex"] = 100
	}
	//const filter = JSON.stringify({
	//	start: data.kind,
	//	start_field: 'label', 
	//	start_term: data.label,
	//	search_type: "explore",
	//	relation: rela
	//	})
	
	return (
		<Card sx={{marginTop: 2, marginBottom: 2, ...extrasx}}>
			<CardContent sx={{padding: 2}}>
				{elements}
			</CardContent>
			{data.kind !== "Relation" &&
            <CardActions>

	    {!filta["end_term"] && <Tooltip title="Delete Node">
				<Link href={`${pathname}?${filter_field}=${JSON.stringify({
					...filta,
					remove: [...(filta["remove"] || []), data.id]
				})}${Object.keys(queryParams).length ? "&" + Object.entries(queryParams).map(([k,v])=>`${k}=${v}`).join("&"): ""}`}>
					<IconButton>
						<DeleteIcon/>
					</IconButton> 
				</Link>
            </Tooltip>}

              <Tooltip title="Expand Node">
				<Link href={`${process.env.NEXT_PUBLIC_HOST}/${pathname}?filter=${expand_filter}`}>
					<IconButton>
						<HubIcon sx={{transform: "scaleX(-1)"}}/>
					</IconButton>
				</Link>
              </Tooltip>
            </CardActions>
          }
		</Card>
	)
}

const TooltipComponentGroup = ({
	elements,
	tooltip_templates_nodes,
    tooltip_templates_edges,
	schema,
	float,
	rel,
	filter
}: {
		elements: null | NetworkSchema,
		tooltip_templates_edges: {[key: string]: Array<{[key: string]: string}>},
        tooltip_templates_nodes: {[key: string]: Array<{[key: string]: string}>},
		schema: UISchema,
		float?: boolean,
		rel?: string| Array<string | {name?: string, limit?: string}>,
		filter?:string
	}) => {
	let filta = filter	
	let [tooltip, setTooltip] = useQueryState('tooltip', {
						 defaultValue: 'true'
	})
	const [selected, setSelected] = useQueryState('selected',  parseAsJson<{id: string, type: 'nodes' | 'edges'}>().withDefault(null))
	const [hovered, setHovered] = useQueryState('hovered',  parseAsJson<{id: string, type: 'nodes' | 'edges'}>().withDefault(null))
	const [elementMapper, setElementMapper] = useState({nodes: {}, edges: {}})
	const relation = rel
	useEffect(()=>{
        if (elements) {
			const nodes = elements.nodes.reduce((acc, i)=>({
				...acc,
				[i.data.id]: i.data
			}), {})

			const edges = elements.edges.reduce((acc, i)=>({
				...acc,
				[`${i.data.source}_${i.data.relation}_${i.data.target}`]: i.data
			}), {})
			setElementMapper({nodes, edges})
		}
    }, [elements])
	const user_input = selected || hovered
	if (tooltip !== 'false' && user_input !== null && elementMapper[user_input.type][user_input.id] !== undefined) {
		return (
			<TooltipComponent 
					data={elementMapper[user_input.type][user_input.id]} 
					tooltip_templates={user_input.type === 'nodes' ? tooltip_templates_nodes: tooltip_templates_edges}
					schema={schema}
					float={float}
					rel={relation}
					filter={filta}
				/>
		)
	}
	else return null
	
}

export default TooltipComponentGroup
