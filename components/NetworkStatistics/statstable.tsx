'use client'
import StackedBarChartForm from "./StackedBarChart"
import BarChartForm from "./BarChart"
import { DataGrid,GridToolbar } from "@mui/x-data-grid"
import React, { ReactNode, useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Selector } from "../misc"
import Link from 'next/link'
import { Typography, TextField, Button, Autocomplete, Grid, Stack, Switch, FormControlLabel, Tab, Tabs, Box } from "@mui/material";
import { any, number, string } from "zod"



const DashboardForm = ({ props, netdata }) => {

    // Extract network statistics, node data, edge data, and node degree data
    const node_data: any = netdata.node_results ?? {};
    const edge_data: any = netdata.edge_results ?? {};
    const stats_data: any = netdata.networkStats_results ?? {}; // Whole network stats
    const degree_data: any = netdata.networkDegree_results ?? {}; // Node degree distribution
    const top_nodes: any = netdata.topNodes_results ?? {};
    console.log(top_nodes)
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter()
    // Convert data for BarChart
    let nodeCounts = node_data.map((item, index) => ({
        id: `node-${index}`,
        type: item.label,
        count: item.value ?? 0 // ✅ Ensure value is always defined
    }));
    nodeCounts = nodeCounts.filter(item => item.type !== "Counter");

    const edgeCounts = edge_data.map((item, index) => ({
        id: `edge-${index}`,
        type: item.label,
        count: item.value ?? 0 // ✅ Ensure value is always defined
    }));
    const nodeDegrees  = degree_data.map((item, index) => ({
        id: `degree-${index}`,
        type: item.label,
        count: Number(item.avgDegree).toFixed(3) ?? 0 // ✅ Ensure value is always defined
    }));
    let topNodes = top_nodes.map((item, index) => ({
        id: `top-${index}`,
        type: item.label[0], // First label of the node
        count: item.topNode, // The node itself
	alt_id: item.topNodeId,
        relationCount: item.relationshipCount // Array of relationship types and counts
    }));
    // Ensure each connected node type has its own count field
    const allNodeTypes = Array.from(new Set(
        topNodes.flatMap(node => node.relationCount.map(rel => rel.nodeType.join("_")))
    ));
    
    topNodes = topNodes.map((item, index) => {
        let nodeTypeCounts: any = {};
    
        // Populate each connected node type's count
        allNodeTypes.forEach(type => {
            const foundType = item.relationCount.find(r => r.nodeType.includes(type)); // Handles multiple labels
            nodeTypeCounts[(type as string)] = foundType ? foundType.count.low : 0;
        });
    
        return {
            id: `top-${index}`,
            type: item.type, // First label of the node
            count: item.count, // The node itself
            ...nodeTypeCounts // Spread dynamically created node type count fields
        };
    });


    //let topNodes = top_nodes.map((item, index) => ({
    //   id: `top-${index}`,
    //   type: item.label[0],
    //   count: item.topNode,
    //   relationCount: item.relationshipCounts
    //}));

    // Convert network stats into DataGrid row format
    const statsRows = Object.entries(stats_data).map(([key, value], index) => ({
        id: `stat-${index}`,
        metric: key
            .split("_")
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" "),
        value: typeof value === "number" ? Number(value.toFixed(4)) : JSON.stringify(value)
    }));
    const uniqueNodeTypes = [...new Set(topNodes.map(item => item.type))];

    // **State for Main Tabs**
    const [activeInTab, setActiveInTab] = useState(0);
    const [nestedTab, setNestedTab] = useState(0);
    const [chartData, setChartData] = useState(nodeCounts); // ✅ Default to node counts to prevent undefined errors

    // Define main tabs
    const tabs = ["Node Counts", "Edge Counts", "Average Author Connections", "Most Connected Nodes"];

    // Update chart data when tab changes
    useEffect(() => {
        let newChartData = [];

        if (activeInTab === 0) newChartData = nodeCounts;
        else if (activeInTab === 1) newChartData = edgeCounts;
        else if (activeInTab === 2) newChartData = nodeDegrees;
	else if (activeInTab === 3) {
                const selectedType = uniqueNodeTypes[nestedTab];
                newChartData = topNodes.filter(node => node.type === selectedType);
	}
        // Ensure it's always a valid array
        setChartData(newChartData.length > 0 ? newChartData : [{ id: "empty", type: "No Data", count: 0 }]); 
    }, [activeInTab, nestedTab]);

    // Determine correct data for DataGrid
    const tableData = activeInTab === 0 ? nodeCounts :
                      activeInTab === 1 ? edgeCounts :
                      activeInTab === 2 ? nodeDegrees : 
		      activeInTab === 3 ? topNodes.filter(node => node.type === uniqueNodeTypes[nestedTab]) : null; 

    const getHeaderName = (tabNum : Number) => {
    	if (tabNum === 2) return "Value";
    	if (tabNum === 3) return "Top Nodes";
    	return "Count"; // Default fallback
    };
    // Define columns for DataGrid
    const columns = (tabNum: Number) => [
        { field: "type", headerName: "Type", flex: activeInTab !== 1 ? 1 : 2, headerAlign: "center", align:"center"},
        { field: "count", headerName: getHeaderName(tabNum), flex: 1, headerAlign: "center", align:"center",
		renderCell: ({row }) => {
			row
		}
	},
    ];

	const alt_columns:any = (tabNum: Number) => {
	    // Identify columns where all values are null
	    const nonNullNodeTypes = allNodeTypes.filter(nodeType =>
	        !tableData.every(row => row[nodeType as any] === 0) // Keep only columns where at least one value is not null
	    );
	    return [
	        { 
	            field: "count", 
	            headerName: "Top " + uniqueNodeTypes[nestedTab], 
	            headerAlign: "center",
    		    renderCell: ({ row }) => {
			    let filta = {
				    "start": uniqueNodeTypes[nestedTab],
				    "start_field":"label",
				    "start_term": row["count"],
				    "search_type": "explore"
			    }
    		            return (
    		                <Link
    		                    color="secondary"
				    href= {{
				    	pathname: "/",
					query: {filter: JSON.stringify(filta)}
				    }}
				    as={`/?filter=${encodeURIComponent(JSON.stringify(filta))}`}>
    		                    {row["count"]}

    		                </Link>
    		            );
    		        }
	        },
	        ...nonNullNodeTypes.map(nodeType => ({
	            field: nodeType,
	            headerName: (nodeType as string).replace(/_/g, " ").toUpperCase(), 
	            flex: 1,
	            headerAlign: "center",
	            align: "center"
	        }))
	    ];
	};


    return (
        <Box sx={{ width: "100%", mt: 2 }}>
            {/* Main Tabs: Node Counts, Edge Counts, Node Degree, Whole Network Stats */}
            <Tabs value={activeInTab} onChange={(_, newValue) => setActiveInTab(newValue)} centered >
                {tabs.map((label, index) => (
                    <Tab key={index} label={label} sx={{ fontSize: 20, color: "#336699" }} />
                ))}
            </Tabs>
            {activeInTab === 3 && (
                <Tabs value={nestedTab} onChange={(_, newValue) => setNestedTab(newValue)} centered sx={{ mt: 2 }}>
                    {uniqueNodeTypes.map((type:any, index) => (
                        <Tab key={index} label={type} sx={{ fontSize: 16, color: "#336699" }} />
                    ))}
                </Tabs>
            )}
            <Grid container spacing={2} sx={{ mt: 2 }}>
                {/* Left Side: Bar Chart */}
                <Grid item xs={6}>
                    {activeInTab === 3 ? null : ( activeInTab === 1 ? (
                        <StackedBarChartForm props={props} chartData={chartData} /> // ✅ Use stacked chart for edges
                    ) : (
                        <BarChartForm props={props} chartData={chartData} />
		    ))}
                </Grid>

                {/* Right Side: Data Table */}
                <Grid item xs={activeInTab !== 3 ? 6 : 12}>
                    <DataGrid
                        sx={{ backgroundColor: "white", color: "#336699", borderRadius: 2, mt: 2, textAlign: "center",
			    '& .MuiDataGrid-columnHeaders': {
    				  fontWeight: 'bold'
    				}}}
                        rows={tableData}
			columns={activeInTab === 3 ? alt_columns(3) : columns(activeInTab)}
			autoHeight
                        disableSelectionOnClick
			pageSize={8}
			{...(tableData.length < 9 && {hideFooter: true} )}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};


export default DashboardForm
