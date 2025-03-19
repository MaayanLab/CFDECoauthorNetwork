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
const StackedBarChartForm = ({ props, chartData }) => {

    let formatted = chartData.map(item => ({
        ...item,
        type: item.type.split(":")[0]
    }));

    
    let newformatted = chartData.map(item => ({
        ...item,
        supertype: item.type.split(":")[0].trim()
    }));


    // Extract unique category types
    const categories = [...new Set(newformatted.map(item => item.supertype))];

    // Create an indexed map for positioning
    const categoryIndexMap = categories.reduce((acc, category: any, index) => {
        acc[category] = index;
        return acc;
    }, {});


    const pos_data_array = (item_arr, category, catMap) => {
	let item = item_arr
    	const position = catMap[category]
	let ret_arry = Array(position).fill(0).concat(item.count)
	return ret_arry; 
    }
    // Create a blue color palette with distinct shades
    const blueColorPalette = [
        '#336699', // Deep Blue
        '#336699', // Deep Blue
        '#336699', // Deep Blue
        '#64B5F6', // Lighter Blue
        '#336699', // Deep Blue
        '#64B5F6' // Lighter Blue
    ];

    let chartdata = {
        xAxis: [
            {
                scaleType: "band" as const,
                data: ['Coauthors', 'MeSH', 'Publications', 'Awards'],
                tickLabelStyle: { angle: -60 as const, textAnchor: 'end' as const} as const
	    }
        ],
        series: newformatted.map((item, index) => ({
            stack: "a" as const,
	    label: item.type,
            data: pos_data_array(item, item.supertype, categoryIndexMap),
            valueFormatter: (v) => {
		console.log(index)
            	return item.count
            },
            color: blueColorPalette[index],
            highlightScope: {
                highlighted:"item" as const,
                faded: "global" as const
            }
        }))
    };
    return (
        <BarChart
	    xAxis={chartdata.xAxis}
            series={chartdata.series}
            height={650}
            margin={{ bottom: 200 }}
            tooltip={{trigger: 'item'}}
            slotProps={{
                legend: { hidden: true }
            }}
        />
    );
};

//  xAxis={chartdata.xAxis}
export default StackedBarChartForm
