import { Typography, Link } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { Grid } from '@mui/material'
import BarChartForm from './BarChart'
import TableForm from './statstable'
import { NextDataPathnameNormalizer } from 'next/dist/server/future/normalizers/request/next-data';
import {Stack} from '@mui/material'
import { DataGrid } from "@mui/x-data-grid"
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
    const edge_data: any = netdata.edge_results ?? {};
    const stats_data: any = netdata.networkStats_results ?? {}; // Network stats
    console.log(stats_data)
    // Convert stats_data object into DataGrid row format
	const statsRows = Object.entries(stats_data[0] || stats_data).map(([key, value], index) => ({
	    id: index, // Unique ID for MUI DataGrid
	    metric: key
 		 .split("_")
 		 .map(part => part.charAt(0).toUpperCase() + part.slice(1))
 		 .join(" "),
	    value: typeof value === "object" ? JSON.stringify(value) : value // Ensure numbers remain numbers
	}));

    console.log(statsRows)

    // Define columns for the DataGrid
    const columns = [
        { field: "metric", headerName: "Metric", flex: 1 },
        { field: "value", headerName: "Value", flex: 1 }
    ];

    return (
        <Grid container spacing={2}>
            {/* Left side: Node & Edge Bar Charts */}
            <Grid item xs={6}>
                <Stack>
                    <Typography variant="body1" sx={{ textAlign: "center", fontSize: "24px", color: "#336699" }}>
                        Node Counts
                    </Typography>
                    <BarChartForm props={props} chartData={node_data} />

                    <Typography variant="body1" sx={{ textAlign: "center", fontSize: "24px", color: "#336699" }}>
                        Edge Counts
                    </Typography>
                    <BarChartForm props={props} chartData={edge_data} />
                </Stack>
            </Grid>

            {/* Right side: Network Statistics DataGrid */}
            <Grid item xs={6}>
                <Typography variant="body1" sx={{ textAlign: "center", fontSize: "24px", color: "#336699", mb: 2 }}>
                    Network Statistics
                </Typography>
                <TableForm
                    props={props}
                    rows={statsRows}
                    columns={columns}
                />
            </Grid>
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
//            <Grid item xs={6}>
//	    		<Stack>
//	    		<Typography variant="body1" sx={{textAlign: "center", fontSize:"24", color:"336699"}}> Node Counts </Typography>
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
