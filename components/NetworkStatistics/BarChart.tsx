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

const BarChartForm = ({ props, chartData }) => {
    let processedChartData = chartData.map(item => ({
	    ...item,
	    count: parseFloat(item.count)
	}))

    
    // Transform data for MUI X-Charts
    let chartdata = {
        xAxis: [
            {
                scaleType: "band" as const,
                dataKey: "type" as const, // Use type for x-axis
                tickLabelStyle: {
                    angle: -60 as const,
                    textAnchor: 'end' as const
                } as const
            }
        ],
        series: [
	    {
	    	dataKey: "count" as const,
	    	color: "#336699" as const,
	    	highlightScope: {
	    	    faded: "global" as const
	    	} as const
	    }
	]
    };
    console.log(chartdata)
    return (
        <BarChart
	    dataset={processedChartData}
        series={chartdata.series}
        xAxis={chartdata.xAxis}
        height={650}
	    tooltip={{trigger: 'axis'}}
	    margin={{bottom:200}}
        />
    );
};


//        series: [
//            {
//                data: newchartData, // Use count for y-axis
//                color: "#336699",
//        	highlightScope: {
//        	    highlighted:"item",
//        	    faded: "global"
//        	}
//            }
//        ]
export default BarChartForm
