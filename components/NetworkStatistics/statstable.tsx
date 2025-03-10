'use client'
import StackedBarChartForm from "./StackedBarChart"
import BarChartForm from "./BarChart"
import { DataGrid } from "@mui/x-data-grid"
import React, { ReactNode, useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Selector } from "../misc"
import Link from 'next/link'
import { Typography, TextField, Button, Autocomplete, Grid, Stack, Switch, FormControlLabel, Tab, Tabs, Box } from "@mui/material";
import { any, string } from "zod"

const DashboardForm = ({ props, netdata }) => {

    // Extract network statistics, node data, edge data, and node degree data
    const node_data: any = netdata.node_results ?? {};
    const edge_data: any = netdata.edge_results ?? {};
    const stats_data: any = netdata.networkStats_results ?? {}; // Whole network stats
    const degree_data: any = netdata.networkDegree_results ?? {}; // Node degree distribution
    const top_nodes: any = netdata.topNodes_results ?? {};
    
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
       type: item.label[0],
       count: item.topNode
    }));
    topNodes = topNodes.filter(item => item.type !== "Counter")

    // Convert network stats into DataGrid row format
    const statsRows = Object.entries(stats_data).map(([key, value], index) => ({
        id: `stat-${index}`,
        metric: key
            .split("_")
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" "),
        value: typeof value === "number" ? Number(value.toFixed(4)) : JSON.stringify(value)
    }));

    // **State for Main Tabs**
    const [activeTab, setActiveTab] = useState(0);
    const [chartData, setChartData] = useState(nodeCounts); // ✅ Default to node counts to prevent undefined errors

    // Define main tabs
    const tabs = ["Node Counts", "Edge Counts", "Average Node Degree", "Most Connected Nodes"];

    // Update chart data when tab changes
    useEffect(() => {
        let newChartData = [];

        if (activeTab === 0) newChartData = nodeCounts;
        else if (activeTab === 1) newChartData = edgeCounts;
        else if (activeTab === 2) newChartData = nodeDegrees;
	else if (activeTab === 3) newChartData = topNodes;
        
        // Ensure it's always a valid array
        setChartData(newChartData.length > 0 ? newChartData : [{ id: "empty", type: "No Data", count: 0 }]); 
    }, [activeTab, nodeCounts, edgeCounts, nodeDegrees]);

    // Determine correct data for DataGrid
    const tableData = activeTab === 0 ? nodeCounts :
                      activeTab === 1 ? edgeCounts :
                      activeTab === 2 ? nodeDegrees : 
		      activeTab === 3 ? topNodes : null

    const getHeaderName = (tabNum : Number) => {
    	if (tabNum === 2) return "Average Node Degree";
    	if (tabNum === 3) return "Top Nodes";
    	return "Count"; // Default fallback
    };
    // Define columns for DataGrid
    const columns = (tabNum: Number) => [
        { field: "type", headerName: "Type", flex: activeTab !== 1 ? 1 : 2},
        { field: "count", headerName: getHeaderName(tabNum), flex: 1 }
    ];


    return (
        <Box sx={{ width: "100%", mt: 2 }}>
            {/* Main Tabs: Node Counts, Edge Counts, Node Degree, Whole Network Stats */}
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} centered >
                {tabs.map((label, index) => (
                    <Tab key={index} label={label} sx={{ fontSize: 20, color: "#336699" }} />
                ))}
            </Tabs>

            <Grid container spacing={2} sx={{ mt: 2 }}>
                {/* Left Side: Bar Chart */}
                <Grid item xs={6}>
                    {activeTab === 3 ? null : ( activeTab === 1 ? (
                        <StackedBarChartForm props={props} chartData={chartData} /> // ✅ Use stacked chart for edges
                    ) : (
                        <BarChartForm props={props} chartData={chartData} />
		    ))}
                </Grid>

                {/* Right Side: Data Table */}
                <Grid item xs={activeTab !== 3 ? 6 : 12}>
                    <DataGrid
                        sx={{ backgroundColor: "white", color: "#336699", borderRadius: 2, mt: 2}}
                        rows={tableData}
                        columns={columns(activeTab)}
			            autoHeight
                        disableColumnMenu
                        disableSelectionOnClick
			pageSize={8}
			{...(tableData.length < 5 && {hideFooter: true} )}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

//const DashboardForm = ({ props, netdata }) => {
//    // Extract network statistics, node data, and edge data
//    const node_data: any = netdata.node_results ?? {};
//    const edge_data: any = netdata.edge_results ?? {};
//    const stats_data: any = netdata.networkStats_results ?? {}; // Network stats
//
//    // Convert stats_data into DataGrid row format
//    let statsRows = Object.entries(stats_data[0] || stats_data).map(([key, value], index) => ({
//        id: index,
//        metric: key
//            .split("_")
//            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
//            .join(" "),
//        value: typeof value === "number" ? Number(value.toFixed(4)) : JSON.stringify(value)
//    }));
//
//    // Function to transform node_data and edge_data properly
//    const transformData = (data: Record<string, { label: string; value: number | string }>, prefix: string, startId: number) =>
//        Object.values(data).map((entry: { label: string; value: number | string }, index) => ({
//            id: startId + index,
//            type: entry.label, // Store node/edge type separately for filtering
//            metric: `${prefix} - ${entry.label}`,
//            value: typeof entry.value === "number" ? Number(entry.value.toFixed(4)) : entry.value
//        }));
//
//    // Convert node_data and edge_data
//    const nodeRows = transformData(node_data, "Node", statsRows.length);
//    const edgeRows = transformData(edge_data, "Edge", statsRows.length + nodeRows.length);
//
//    // **State to manage main tabs**
//    const [activeTab, setActiveTab] = useState(0);
//
//    // **State for Node & Edge subtabs**
//    const [nodeTab, setNodeTab] = useState(0);
//    const [edgeTab, setEdgeTab] = useState(0);
//
//    // Extract unique node and edge types for subtabs
//    const nodeTypes = Array.from(new Set(nodeRows.map(row => row.type)));
//    const edgeTypes = Array.from(new Set(edgeRows.map(row => row.type)));
//
//    // Filter node and edge data based on selected subtab
//    const filteredNodeRows = nodeTab === 0 ? nodeRows : nodeRows.filter(row => row.type === nodeTypes[nodeTab - 1]);
//    const filteredEdgeRows = edgeTab === 0 ? edgeRows : edgeRows.filter(row => row.type === edgeTypes[edgeTab - 1]);
//
//    // Define columns for DataGrid
//    const columns = [
//        { field: "metric", headerName: "Metric", flex: 1 },
//        { field: "value", headerName: "Value", flex: 1 }
//    ];
//
//    // Tab labels
//    const tabs = ["Network Stats", "Node Stats", "Edge Stats"];
//
//    return (
//    <Grid container>
//	<Grid item xs={6}>
//	    	<BarChartForm 
//                    props={props}
//                    chartData={node_data}
//                    />
//	</Grid>
//	<Grid item xs={6}>
//            {/* Main Tabs: Network, Nodes, Edges */}
//            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} centered variant="scrollable">
//                {tabs.map((label, index) => (
//                    <Tab key={index} label={label} sx={{ fontSize: 20, color: "#336699" }} />
//                ))}
//            </Tabs>
//
//            {/* Show Node Subtabs */}
//            {activeTab === 1 && (
//                <Tabs value={nodeTab} onChange={(_, newValue) => setNodeTab(newValue)} centered variant="scrollable" sx={{ mt: 2 }}>
//                    <Tab label="All Nodes" />
//                    {nodeTypes.map((type, index) => (
//                        <Tab key={index + 1} label={type} />
//                    ))}
//                </Tabs>
//            )}
//
//            {/* Show Edge Subtabs */}
//            {activeTab === 2 && (
//                <Tabs value={edgeTab} onChange={(_, newValue) => setEdgeTab(newValue)} centered variant="scrollable" sx={{ mt: 2 }}>
//                    <Tab label="All Edges" />
//                    {edgeTypes.map((type, index) => (
//                        <Tab key={index + 1} label={type} />
//                    ))}
//                </Tabs>
//            )}
//
//            <Typography variant="body1" sx={{ textAlign: "center", fontSize: "18px", color: "#336699", mt: 2 }}>
//                {activeTab === 1 ? `Node Type: ${nodeTab === 0 ? "All" : nodeTypes[nodeTab - 1]}` : 
//                 activeTab === 2 ? `Edge Type: ${edgeTab === 0 ? "All" : edgeTypes[edgeTab - 1]}` : 
//                 "Network Statistics"}
//            </Typography>
//
//            {/* DataGrid with Pagination */}
//            <DataGrid
//                rows={activeTab === 0 ? statsRows : activeTab === 1 ? filteredNodeRows : filteredEdgeRows}
//                columns={columns}
//                autoHeight
//                disableColumnMenu
//                disableSelectionOnClick
//                sx={{ backgroundColor: "white", color: "#336699", borderRadius: 2, mt: 2 }}
//            />
//		</Grid>
//	</Grid>
//    );
//};


//const TableForm = ({ props, netdata }) => {
//    // Extract network statistics, node data, and edge data
//    const node_data: any = netdata.node_results ?? {};
//    const edge_data: any = netdata.edge_results ?? {};
//    const stats_data: any = netdata.networkStats_results ?? {}; // Network stats
//
//    // Convert stats_data into DataGrid row format
//    let statsRows = Object.entries(stats_data[0] || stats_data).map(([key, value], index) => ({
//        id: index,
//        metric: key
//            .split("_")
//            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
//            .join(" "),
//        value: typeof value === "number" ? Number(value.toFixed(4)) : JSON.stringify(value)
//    }));
//
//    // Function to transform node_data and edge_data properly
//    const transformData = (data: Record<string, { label: string; value: number | string }>, prefix: string, startId: number) =>
//        Object.values(data).map((entry: { label: string; value: number | string }, index) => ({
//            id: startId + index,
//            type: entry.label, // Store node/edge type separately for filtering
//            metric: `${prefix} - ${entry.label}`,
//            value: typeof entry.value === "number" ? Number(entry.value.toFixed(4)) : entry.value
//        }));
//
//    // Convert node_data and edge_data
//    const nodeRows = transformData(node_data, "Node", statsRows.length);
//    const edgeRows = transformData(edge_data, "Edge", statsRows.length + nodeRows.length);
//
//    // **State to manage main tabs**
//    const [activeTab, setActiveTab] = useState(0);
//
//    // **State for Node & Edge subtabs**
//    const [nodeTab, setNodeTab] = useState(0);
//    const [edgeTab, setEdgeTab] = useState(0);
//
//    // Extract unique node and edge types for subtabs
//    const nodeTypes = Array.from(new Set(nodeRows.map(row => row.type)));
//    const edgeTypes = Array.from(new Set(edgeRows.map(row => row.type)));
//
//    // Filter node and edge data based on selected subtab
//    const filteredNodeRows = nodeTab === 0 ? nodeRows : nodeRows.filter(row => row.type === nodeTypes[nodeTab - 1]);
//    const filteredEdgeRows = edgeTab === 0 ? edgeRows : edgeRows.filter(row => row.type === edgeTypes[edgeTab - 1]);
//
//    // Define columns for DataGrid
//    const columns = [
//        { field: "metric", headerName: "Metric", flex: 1 },
//        { field: "value", headerName: "Value", flex: 1 }
//    ];
//
//    // Tab labels
//    const tabs = ["Network Stats", "Node Stats", "Edge Stats"];
//
//    return (
//        <Box sx={{ width: "100%", mt: 2 }}>
//            {/* Main Tabs: Network, Nodes, Edges */}
//            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} centered variant="scrollable">
//                {tabs.map((label, index) => (
//                    <Tab key={index} label={label} sx={{ fontSize: 20, color: "#336699" }} />
//                ))}
//            </Tabs>
//
//            {/* Show Node Subtabs */}
//            {activeTab === 1 && (
//                <Tabs value={nodeTab} onChange={(_, newValue) => setNodeTab(newValue)} centered variant="scrollable" sx={{ mt: 2 }}>
//                    <Tab label="All Nodes" />
//                    {nodeTypes.map((type, index) => (
//                        <Tab key={index + 1} label={type} />
//                    ))}
//                </Tabs>
//            )}
//
//            {/* Show Edge Subtabs */}
//            {activeTab === 2 && (
//                <Tabs value={edgeTab} onChange={(_, newValue) => setEdgeTab(newValue)} centered variant="scrollable" sx={{ mt: 2 }}>
//                    <Tab label="All Edges" />
//                    {edgeTypes.map((type, index) => (
//                        <Tab key={index + 1} label={type} />
//                    ))}
//                </Tabs>
//            )}
//
//            <Typography variant="body1" sx={{ textAlign: "center", fontSize: "18px", color: "#336699", mt: 2 }}>
//                {activeTab === 1 ? `Node Type: ${nodeTab === 0 ? "All" : nodeTypes[nodeTab - 1]}` : 
//                 activeTab === 2 ? `Edge Type: ${edgeTab === 0 ? "All" : edgeTypes[edgeTab - 1]}` : 
//                 "Network Statistics"}
//            </Typography>
//
//            {/* DataGrid with Pagination */}
//            <DataGrid
//                rows={activeTab === 0 ? statsRows : activeTab === 1 ? filteredNodeRows : filteredEdgeRows}
//                columns={columns}
//                autoHeight
//                disableColumnMenu
//                disableSelectionOnClick
//                pageSizeOptions={[5]}
//                paginationModel={{ pageSize: 5, page: 0 }}
//                sx={{ backgroundColor: "white", color: "#336699", borderRadius: 2, mt: 2 }}
//            />
//        </Box>
//    );
//};

// pageSizeOptions={[5]} // Ensures only 5 rows per page
export default DashboardForm
