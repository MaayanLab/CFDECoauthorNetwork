import { Typography, Link } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { Grid } from '@mui/material'
import BarChartForm from './BarChart'
import DashboardForm from './statstable'
import { NextDataPathnameNormalizer } from 'next/dist/server/future/normalizers/request/next-data';
import {Stack, Tabs, Tab} from '@mui/material'
import { DataGrid } from "@mui/x-data-grid"
import React, { useState } from "react"
export const initialize_net_data = async () => {
    const controller = new AbortController();
    
    // Properly encode the query parameter
    const queryParams = new URLSearchParams({ type: "initialize" }).toString();

    const baseUrl = `${process.env.NODE_ENV === "development" ? process.env.NEXT_PUBLIC_HOST_DEV : process.env.NEXT_PUBLIC_HOST}`;
    const prefix = process.env.NEXT_PUBLIC_PREFIX ? process.env.NEXT_PUBLIC_PREFIX : "";
    
    // Construct the full URL with query parameters
    const url = `${baseUrl}${prefix}/api/networkstatistics/?${queryParams}`;

    const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal
    });

    let data = {};
    if (res.ok) data = await res.json();

    return data;
}



const NetworkStatistics = async ({ props }) => {
    let netdata:any = await initialize_net_data(); // Fetch data
    const node_data: any = netdata.node_results ?? {};

    return (
        <Grid>
            {/* Left side: Node & Edge Bar Charts */}
	    {/* <Grid item xs={6}>
                <Stack>
                    <Typography variant="body1" sx={{ textAlign: "center", fontSize: "24px", color: "#336699", mb: 0 }}>
                        Node Counts
                    </Typography>
                    <BarChartForm props={props} chartData={node_data} />
                </Stack>
            </Grid> */}

            {/* Right side: Network Statistics DataGrid 
                <Typography variant="body1" sx={{ textAlign: "center", fontSize: "24px", color: "#336699", mb: 4.5}}>
                    Network Statistics
                </Typography>*/}
            <DashboardForm
                    props={props}
		    netdata={netdata}
	    />
        </Grid>
    );
};

export default NetworkStatistics;

//const NetworkStatistics = async ({props}) => {
//    let netdata: any = await initialize_net_data()
//    const node_data = netdata.node_results ?? {}
//    const edge_data = netdata.edge_results ?? {}
//    const stats_data = netdata.networkStats_results ?? {}
//    //const formattedSeries = [{ data: netdata.map(item => item.value) }]
//    return (
//        <Grid container spacing={2}>
//            <Grid item xs={12}>
//	    		<Stack>
//	    		<Typography variant="body1" sx={{textAlign: "center", fontSize:"24", color:"336699", mb: 4}}> Node Counts </Typography>
//                <BarChartForm
//                        props={props}
//                        chartData={node_data}
//                />
//	    		<Typography variant="body1" sx={{textAlign: "center", fontSize:"24", color:"#336699"}}> Edge Counts </Typography>
//                <BarChartForm
//                props={props}
//                    
//                chartData={edge_data}
//                />
//            </Stack>
//	    </Grid>
//	    <Grid item xs={6}>
//
//	    </Grid>
//        </Grid>
//
//        
//    )
//}
//
//export default NetworkStatistics 
