'use client'
import React, { ReactNode, useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Selector } from "../misc"
import Link from 'next/link'
import { Typography, TextField, Button, Autocomplete, Grid, Stack, Switch, FormControlLabel, Radio, RadioGroup, FormControl, FormLabel } from "@mui/material";
import { router_push } from "@/utils/client_side"
import { process_filter } from "@/utils/helper"
import { FilterSchema } from "@/utils/helper"
import { styled } from "@mui/system";
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
const StyledRadioGroup = styled(RadioGroup)(({ theme }) => ({
  gap: theme.spacing(1),
  transition: "all 0.3s ease",
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

const AsyncFormComponent_Minimum = ({
    nodes, 
    searchParams,
    initial_query,
    extras,
    example
}: {
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
	extras?:string[],
	example?:{}
	}) => {
	const router = useRouter()
	const {filter: f, ...rest} = searchParams
	const pathname = usePathname()
    let filter = JSON.parse(f || '{}')
	if (Object.keys(filter).length === 0) filter = initial_query
    const {
	start="Authors",
        start_field='label',
        start_term,
	search_type
    }: {[key:string]: string} = filter
    const start_extras = extras
    const start_filter = {
	start,
        start_field,
        start_term
    }
    console.log(searchParams)
    console.log(start_extras)
    filter.start_extras = start_extras
    filter.limit = 1
    const field = start_field || ''
    const term = start_term || ''
    const [inputTerm, setInputTerm] = useState<string>(term)
    const [type, setType] = useState<string>('Authors')
    const [controller, setController] = useState<{signal: AbortSignal, abort: Function} | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [options, setOptions] = useState<{[key:string]: {[key:string]: string|number}} | null>(null)
    const [selected, setSelected] = React.useState(null)
    const [searchType, setSearchType] = useState(filter.search_type || "explore");
    const [clicked, setClicked] = useState<boolean>(false)   
    const [exampleOption, setExampleOption] =  useState<{[key:string]: any}>(example)
    
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
                // else if (direction === 'Start') {
                //     router_push(router, pathname, {
                //         ...rest,
                //         filter: JSON.stringify({
                //             ...filter,
                //             start_term: Object.keys(options)[0],
                //         })
                //     })
                // } 
                else {
                    setSelected(null)
                }
                setOptions(options)  
            }
        } catch (error) {
            console.error(error)
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

    // ✅ Ensure filter updates when `searchType` changes
    useEffect(() => {
        if (filter.search_type !== searchType) {
	    	if (searchType == "direct_connect") {
	    	        filter.end = "Authors" 
			filter.limit = 5
			filter.limit_extra = 2
			router_push(router, pathname, {
            		    ...rest,
            		    filter: JSON.stringify({ ...filter, search_type: searchType, start: "Authors", start_field:"label",
			    	relation: initial_query.relation}),
            		});
	    	} else if (searchType == "explore") {
			filter.limit = 5
			filter.limit_extra = 1
            		router_push(router, pathname, {
            		    ...rest,
            		    filter: JSON.stringify({ ...filter, search_type: searchType, start: "Authors", start_field:"label",
			    	relation: initial_query.relation}),
            		});
		} 
	}
    }, [searchType]);

    //useEffect(() => {
    //    filter.search_type = searchType;
    //	resolve_options();
    //}, [searchType]);
    return (
        <Grid container spacing={2} justifyContent="flex-start" alignItems="center">
	    <Grid item xs={12}>
               <FormControl sx = {{display:"block"}}>
                        <FormLabel sx = {{textAlign: "center", mb: "1", color:"#336699", fontSize: "1.125rem", fontWeight:"bold", display:"block"}}>Pick Search Type</FormLabel>

                        <StyledRadioGroup
				value={searchType}
                                onChange={(event) => setSearchType(event.target.value)}
				defaultValue="explore" name="radio-buttons-group">
                            <FormControlLabel value="explore" control={<Radio sx={{display:"None"}} />} label="Single Author Search" sx = {{
			    	border: searchType === "explore" ? "2px solid #336699 " : "2px solid #3366994d", display:"block", textAlign: "center" 
			    }}/>
                            <FormControlLabel value="direct_connect" control={<Radio sx={{display:"None"}} />} label="Two Author Search" sx = {{
			    	border: searchType === "direct_connect" ? "2px solid #336699" : "2px solid #3366994d ", display:"block", textAlign: "center"
			    }}/>
                            <FormControlLabel value="min_connect" control={<Radio sx={{display:"None"}} />} label="Just Author Search" sx = {{
			    	border: searchType === "min_connect" ? "2px solid #336699" : "2px solid #3366994d", display:"block", textAlign: "center"
			    }}/>

                        </StyledRadioGroup>
                </FormControl>

	    </Grid>
            <Grid item xs={12}>
                <Typography variant="body1" color="secondary"><b>Choose an Author</b></Typography>
            </Grid>
            <Grid item xs={12}>
                <Autocomplete
                    id="my-input" aria-describedby="gene" 
                    options={Object.keys(options || {})}
                    value={term}
                    loading={loading}
                    onChange={(evt, term) => {
                        if (term === null) term = ''
                        setInputTerm(term)
			let relation = filter.relation
							if (typeof term === 'number' && !isNaN(term)) {
								router_push(router, pathname,	
									{
                            	        ...rest,
                            	        filter: JSON.stringify({
					    search_type: searchType,
                            	            start: "Authors",
                            	            start_field: field,
                            	            start_term: parseInt(term),
					    start_extras: extras,
					    relation: relation,
					    limit: parseInt("1"),
					    limit_extra: parseInt("10")

                            	        })
                            	    }
								)
							} else{
								router_push(router, pathname,
									{
                        	            ...rest,
                        	            filter: JSON.stringify({
						search_type: searchType,
                        	                start: "Authors",
                        	                start_field: field,
                        	                start_term: term,
						start_extras: extras,
						relation: relation,
						limit: parseInt("1"),
						limit_extra: parseInt("10")
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
					let ex = Object.values(exampleOption || {})[1]?.label;
					let relation = filter.relation
                        	        let query = JSON.stringify({
					     search_type: searchType,
                        	             start: "Authors",
                        	             start_field: "label",
                        	             start_term: ex,
					     relation: relation,
					     limit: parseInt("1"),
					     limit_extra: parseInt("10")
                        	        })
					router_push(router, pathname, {filter:query})
					setClicked(true)
				}}> Try an Example! </Button>
		</Stack>
            </Grid>
        	 
        </Grid>
    )
}

export default AsyncFormComponent_Minimum;
