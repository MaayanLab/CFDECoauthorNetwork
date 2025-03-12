import { Grid, Typography, } from "@mui/material"
import Link from 'next/link';
import ClientSide from "./client_side";

const AllFiles = ({download}: {download: {
	network: Array<{
		name: string,
		nodes: number,
		edges: number,
		zip: string,
		size: string
	}>,
	notebook: Array<{
		title: string,
		description: string,
		size: string,
		updated: string,
		url: string
	}>
}}) => {
	return (
		<Grid container spacing={2}>
			{/*<Grid item xs={12}>
				<Typography variant={"h2"}>Download Page</Typography>
			</Grid>*/}
			<Grid item xs={12}>
				<Typography variant={"h3"}>Networks</Typography>
				<Typography variant={"body1"}>
				The entry below contains the zipped file of all nodes and edges in the KG-UI standardized format as well as the individual nodes and edges in their respective .csv files.	
				</Typography>
			</Grid>
			<Grid item xs={12}>
				<ClientSide download={(download.network || []).map(i=>({id: i.zip, ...i}))} type='network'/>
			</Grid>
			<Grid item xs={12}>
				<Typography variant={"h3"}>Network-Building Notebooks</Typography>
				<Typography variant={"body1"}>
				Links to notebooks used to construct, build, and filter the CFDE Co-authorship Network.
				</Typography>
			</Grid>
			<Grid item xs={12}>
				<ClientSide download={(download.notebook || []).map(i=>({id: i.url, ...i}))} type='notebook'/>
			</Grid>
			
		</Grid>
	)
}

export default AllFiles
