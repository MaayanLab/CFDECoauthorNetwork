'use client'
import React, { ReactNode, useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Selector } from "../misc"
import Link from 'next/link'
import { Typography, TextField, Button, Autocomplete, Grid, Stack, Switch, FormControlLabel, Radio, RadioGroup, FormControl, FormLabel, Tooltip } from "@mui/material";
import { styled } from "@mui/system";
import { router_push } from "@/utils/client_side"
import { process_filter } from "@/utils/helper"
import { FilterSchema } from "@/utils/helper"
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
const StyledRadioGroup = styled(RadioGroup)(({ theme }) => ({
  gap: theme.spacing(1),
  transition: "all 0.3s ease",
  color: "secondary",
  "& .MuiFormControlLabel-root": {
    margin: 0,
    padding: theme.spacing(1),
    borderRadius: theme.spacing(1),
    transition: "background-color 0.3s ease, transform 0.2s ease",
    "&:hover": {
      backgroundColor: "rgba(0, 0, 0, 0.04)",
      transform: "scale(1.02)"
    },
    "&.Mui-checked": {
      backgroundColor: "rgba(0, 0, 0, 0.02)"
    }
  },
  "& .Mui-focused": {
    outline: `2px solid ${theme.palette.secondary.dark}`,
    outlineOffset: "1px",
    borderRadius: theme.spacing(0.25)
  },
  "& .MuiRadio-root": {
    padding: theme.spacing(1),
    "&.Mui-checked": {
      color: theme.palette.secondary.dark,
      backgroundColor: "rgba(0, 0, 0, 0.02)"
    },
    "&:hover": {
      backgroundColor: "rgba(0, 0, 0, 0.04)"
    }
  }
}));


const AsyncFormComponent_Coauthor = ({direction,
    nodes, 
    searchParams,
    initial_query,
    extras,
    example
}: {
		direction: string,
        initial_query: {[key: string]: string},
		nodes: {[key:string]: {[key:string]: any}},
		searchParams: {
            filter?: string,
            fullscreen?: 'true',
            view?:string,
            tooltip?: 'true',
            edge_labels?: 'true',
            legend?: 'true',
            legend_size?: string,
            layout?: string,
        },
	example?: {},
	extras?:string[],
	}) => {
	const router = useRouter()
	const {filter: f, ...rest} = searchParams
	const pathname = usePathname()
    let filter = JSON.parse(f || '{}')
	if (Object.keys(filter).length === 0) filter = initial_query
    const {
        start,
        start_field='label',
        start_term,
        end,
        end_field='label',
        end_term,
	search_type
    }: {[key:string]: string} = filter
    let {relation} = filter
    const start_filter = {
        start,
        start_field,
        start_term
    }
    const end_filter = {
        end,
        end_field,
        end_term
    }
    const extras_lis = extras 
    const field = direction === 'Start' ? start_field: end_field
    const term = (direction === 'Start' ? start_term: end_term) || ''
    const [inputTerm, setInputTerm] = useState<string>(term)
    const [type, setType] = useState<string>('')
    const [controller, setController] = useState<{signal: AbortSignal, abort: Function} | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [options, setOptions] = useState<{[key:string]: {[key:string]: string|number}} | null>(null)
    const [exampleOption, setExampleOption] =  useState<{[key:string]: any}>(example)
    const [selected, setSelected] = React.useState(null)
    const [searchType, setSearchType] = useState(filter.search_type || "explore");
    const [clicked, setClicked] = useState<boolean>(false)


    useEffect(()=>{
        if (Object.keys(filter).length===0) {
            if (direction === 'Start') {
                router_push(router, pathname, {
                    filter: JSON.stringify(initial_query)
                })
            }
        } else {
            const type = direction === 'Start' ? start: end
            if (type) setType(type)
        }
    }, [filter])
    
    const get_controller = () => {
        if (controller) controller.abort()
        const c = new AbortController()
        setController(c)
        return c
    }

    const resolve_options = async () => {
        try {
            if (type !== ''){
                const controller = get_controller()
                const query = {
		    search_type,
                    type,
                    field,
                    term: ""
                }
                // if (filter) query.filter=JSON.stringify(filter)
                if (inputTerm) query.term = inputTerm
                const query_str = Object.entries(query).map(([k,v])=>(`${k}=${v}`)).join("&")
                const res = await fetch(`${process.env.NEXT_PUBLIC_PREFIX ? process.env.NEXT_PUBLIC_PREFIX: ''}/api/coauthorsearch/node_search${query_str ? "?" + query_str : ""}`, {
                    method: 'GET',
                    signal: controller.signal
                })
                let options:{[key:string]: {[key:string]: string|number}} = {}

                if (res.ok) options = await (res).json()
                if (inputTerm) setSelected(options[inputTerm])
                else {
                    setSelected(null)
                }
                setOptions(options)  
            }
        } catch (error) {
            // console.error(error)
        } finally {
            setLoading(false)
        }
    }
    const resolve_example = async () => {
    	try {	
		const controller = get_controller()
		const query = {
		    search_type: searchType,
		    type: "Authors",
		    field: "label"
		}
		const query_str = Object.entries(query).map(([k,v])=>(`${k}=${v}`)).join("&")
		const res = await fetch(`${process.env.NEXT_PUBLIC_PREFIX ? process.env.NEXT_PUBLIC_PREFIX: ''}/api/coauthorsearch/node_search/example/${query_str ? "?" + query_str : ""}`, {
		    method: 'GET',
		    signal: controller.signal
		})
		let choices = {}
		if (res.ok) choices = await (res).json()
		setExampleOption(choices)
	} catch(error) {
		console.error(error)
	}
    }
    useEffect(()=>{
        if (term !== inputTerm) setInputTerm(term)
    }, [term])


    useEffect(()=>{
        if (inputTerm !== (selected || {})[field]) resolve_options()
    }, [inputTerm, type])

    useEffect(()=>{
	if (clicked) resolve_example()
	console.log(exampleOption)
	setClicked(false)
    }, [clicked, type])
    useEffect(()=>{
        if (options && Object.keys(options).length) {
            const new_options = {}
            for (const v of Object.values(options)) {
                if (v[field]) {
                    new_options[v[field]] = v
                }
            }
            setOptions(new_options)
        }
    }, [field])
    
    useEffect(() => {
	console.log(filter.search_type)
        if (filter.search_type !== searchType) {
	    console.log("switching search types")
	    relation = filter.relation
	    if (searchType == "direct_connect") {
		    filter.end = "Authors"
		    filter.limit = 5
		    filter.limit_extra = 2
	    }
	    if (searchType == "min_connect") {
		    filter.limit = 1
		    filter.limit_extra = 10
	    }
            router_push(router, pathname, {
                ...rest,
                filter: JSON.stringify({ ...filter, search_type: searchType, start: "Authors", start_field: "label", start_extras:extras_lis, relation: relation}),
            });
        }
    }, [searchType]);
    return (
        <Grid container spacing={2} justifyContent="flex-start" alignItems="center">
	    <Grid item xs={12} justifyContent="center">
               <FormControl sx = {{display:"block"}}>
                        <FormLabel sx = {{textAlign: "center", mb: "1", color:"#336699", fontSize: "1.125rem", fontWeight:"bold", display:"block" }}>Pick Search Type</FormLabel>
                        <StyledRadioGroup 
				value={searchType}
                                onChange={(event) => setSearchType(event.target.value)}
				defaultValue="explore" name="radio-buttons-group">
                            <FormControlLabel value="explore" control={<Radio sx={{display:"None"}} />} label="Single Author Search" sx = {{
			    	border: searchType === "explore" ? "2px solid #336699 " : "2px solid #3366994d", display:"block", textAlign:"center" 
			    }}/>
                            <FormControlLabel value="direct_connect" control={<Radio sx={{display:"None"}} />} label="Two Author Search" sx = {{
			    	border: searchType === "direct_connect" ? "2px solid #336699" : "2px solid #3366994d ", display:"block", textAlign:"center"
			    }}/>
                            <FormControlLabel value="min_connect" control={<Radio sx={{display:"None"}} />} label="Just Author Search" sx = {{
			    	border: searchType === "min_connect" ? "2px solid #336699" : "2px solid #3366994d", display:"block", textAlign:"center"
			    }}/>

                        </StyledRadioGroup>
                </FormControl>

	    </Grid>
            <Grid item xs={12}>
                <Typography variant="body1" color="secondary"><b>Explore </b></Typography>
            </Grid>
            <Grid item xs={12}>
                <Selector 
                    entries={Object.keys(nodes).sort()} 
                    value={type} 
                    prefix={direction} 
                    onChange={(type:string)=>{
			relation = filter.relation
                        if (direction === 'Start') {
                            setInputTerm("")
                            router_push(router, pathname,
                                {
                                    // ...rest,
                                    filter: JSON.stringify({
                                        start: type,
                                        start_field: field,
                                        start_term: "",
					search_type: searchType,
					relation: relation
                                    })
                                }
                            )
                        } else {
                            setInputTerm("")
                            router_push(router, pathname,
                                {
                                    // ...rest,
                                    filter: JSON.stringify({
                                        ...start_filter,
                                        end: type,
                                        end_field: field,
					search_type: searchType
                                        // end_term: nodes[type].example[0]
                                    })
                                }
                            )
                        }
                }}/>
            </Grid>
            <Grid item xs={12}>
                <Selector entries={(nodes[type] || {}).search || []} value={field} prefix={`${type}field`} onChange={(field)=>{
                    const new_term = (selected || {})[field]
                    if (direction === 'Start') {
			relation = filter.relation
                        const f = {
                            search_type: searchType,
			    start: type,
                            start_field: field,
			    start_term: '',
			    relation: relation,
                            ...end_filter
                        }
                        if (new_term) f.start_term = new_term
						router_push(router, pathname,
							{

                                ...rest,
                                filter: JSON.stringify(f)
                            }
						)
                    } else {
                        const f = {
                            ...start_filter,
                            end: type,
                            end_field: field,
							end_term: ''
                        }
                        if (new_term) f.end_term = new_term
                        router_push(router, pathname,
							{
                                ...rest,
                                filter: JSON.stringify(f)
                            }
						)
                    }
                    
                }}/>
            </Grid>
            <Grid item xs={12}>
                <Autocomplete
                    id="my-input" aria-describedby="gene" 
                    options={Object.keys(options || {})}
                    value={term}
                    loading={loading}
                    onChange={(evt, term) => {
                        if (term === null) term = ""
			relation = filter.relation
                        setInputTerm(term)
                        if (direction === 'Start') {
							if (typeof term === 'number' && !isNaN(term)) {
								router_push(router, pathname,	
									{
                            	        ...rest,
                            	        filter: JSON.stringify({
					    search_type: searchType,
                            	            start: type,
                            	            start_field: field,
                            	            start_term: parseInt(term),
					    relation: relation,
                            	            ...end_filter
                            	        })
                            	    }
								)
							} else{
								router_push(router, pathname,
									{
                        	            ...rest,
                        	            filter: JSON.stringify({
						search_type: searchType,
                        	                start: type,
                        	                start_field: field,
                        	                start_term: term,
						relation: relation,
                        	                ...end_filter
                        	            })
                        	        }
								)
							}
                        } else {
							router_push(router, pathname,
								{
                                    ...rest,
                                    filter: JSON.stringify({
                                        ...start_filter,
                                        end: type,
                                        end_field: field,
                                        end_term: term,
                                    })
                                }
							)
                        }
                    }}
                    sx={{ width: '100%'}}
                    renderInput={(params) => (
                    <TextField {...params} 
                        value={inputTerm}
                        sx={{
                            width: '100%',
                            height: 50,
                            borderRadius: 5,
                            padding: 0
                        }}
                        onChange={(e)=> setInputTerm(e.target.value)}
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: null,
                            style: {
                                fontSize: 16,
                                height: 45,
                                width: "100%",
                                paddingLeft: 5,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignContent: "flex-start",
                                backgroundColor: "#FFF"
                            }
                        }}
                        inputProps={{
                            ...params.inputProps,
                            style: {width: "100%"}
                          }}
                    />
                    )}
                />
            </Grid>
            <Grid item xs={12}>
	    	<Stack>
			<Button variant="contained" color="secondary" endIcon={<LightbulbOutlinedIcon />}
				onClick={()=> {
					let ex = {label: ""} 
					ex = Object.values(exampleOption)[1].label;
					relation = filter.relation
                        	        let query = JSON.stringify({
					     search_type: searchType,
                        	             start: "Authors",
                        	             start_field: "label",
                        	             start_term: ex,
					     relation: relation
                        	        })
					router_push(router, pathname, {filter:query})
					setClicked(true)
				}}> Try an Example! </Button>
		</Stack>
	    </Grid>
        	 
            {direction === "Start" && searchType == "Find Direct Connections" && 
                <Grid item xs={12}>
                    <Stack direction={'row'} alignItems={"center"} justifyContent={'space-between'}>
                        <Typography variant="caption">Find Connections between Authors</Typography>
                        <Switch 
                            color="secondary" 
                            checked={filter.end !== undefined}
                            onChange={()=>{
                                if (filter.end) {
                                    // const {filter, ...rest} = searchParams
                                    // c
                                    const {relation, end, end_term, end_field, augment, augment_limit, additional_link_tags, ...filt} = filter
                            
                                    const query = process_filter({
                                        ...rest,
                                        filter: filt
                                    })
                                    router_push(router, pathname, query)
                                } else {
                                    // const {filter, ...rest} = searchParams
                                    const {relation, augment, augment_limit, additional_link_tags, ...f}: {
                                        start?: string,
                                        start_field?: string,
                                        start_term?: string,
                                        end?: string,
                                        end_field?: string,
                                        end_term?: string,
                                        relation?: string| Array<string | {name?: string, limit?: string}>,
                                        limit?: number,
                                        page?: number,
                                        filter?: FilterSchema,
                                        [key: string]: any
                                    } = filter
                                    const query = process_filter({
                                        ...rest,
                                        filter: {
                                            ...f,
                                            end: nodes['Gene'] !== undefined ? 'Gene': Object.keys(nodes)[0],
                                            end_field: 'label',
                                        }
                                    })
                                    router_push(router, pathname, query)
                                }
                            }}
                        />
                    </Stack>
                </Grid>
            }
        </Grid>
    )
}

export default AsyncFormComponent_Coauthor;
