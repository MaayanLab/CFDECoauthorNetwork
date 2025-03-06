'use client'

import React, { ReactNode, useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Selector } from "../misc"
import Link from 'next/link'
import { Typography, TextField, Button, Autocomplete, Grid, Stack, Switch, FormControlLabel } from "@mui/material";
import { router_push } from "@/utils/client_side"
import { process_filter } from "@/utils/helper"
import { FilterSchema } from "@/utils/helper"
import {BarChart} from "@mui/x-charts"
const BarChartForm = ({props, chartData}) => {

	let newchartLabel = chartData.filter(item => item.label !== "Counter").map(item => item.label)
	let newchartData = chartData.filter(item => item.label !== "Counter").map(item => item.value)

	// Transform data for MUI X-Charts
	const chartdata = {
	  xAxis: [
	    {
	      scaleType: "band" as const,
	      data: newchartLabel // Use labels for x-axis
	    }
	  ],
	  series: [
	    {
	      data: newchartData, // Values for y-axis
	      color: "#336699"
	    }
	  ]
	};
	return (
                <BarChart
			sx = {{mt: 0, mb: 0}}
			series={chartdata.series}
			xAxis={chartdata.xAxis}
			height={500}/>
	)

}


export default BarChartForm
