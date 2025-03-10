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
        '#1565C0', // Primary Blue
        '#1976D2', // Medium Blue
        '#1E88E5', // Bright Blue
        '#2196F3', // Standard Blue
        '#42A5F5', // Light Blue
        '#64B5F6', // Lighter Blue
        '#90CAF9', // Very Light Blue
        '#BBDEFB', // Pale Blue
        '#2962FF', // Accent Blue
        '#2979FF', // Vibrant Blue
        '#29B6F6', // Sky Blue
        '#03A9F4', // Light Sky Blue
        '#00B0FF', // Strong Light Blue
        '#0288D1', // Dark Sky Blue
        '#0277BD', // Deep Ocean Blue
        '#01579B', // Dark Ocean Blue
        '#4FC3F7', // Bright Sky Blue
        '#80D8FF', // Very Light Sky Blue
        '#0091EA'  // Vivid Blue
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
            	return item.count
            },
            color: blueColorPalette[index % blueColorPalette.length],
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
