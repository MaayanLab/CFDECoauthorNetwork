'use client'


import { DataGrid } from "@mui/x-data-grid"
import React, { ReactNode, useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Selector } from "../misc"
import Link from 'next/link'
import { Typography, TextField, Button, Autocomplete, Grid, Stack, Switch, FormControlLabel } from "@mui/material";
import { router_push } from "@/utils/client_side"
import { process_filter } from "@/utils/helper"
import { FilterSchema } from "@/utils/helper"
import {BarChart} from "@mui/x-charts"
const TableForm = ({props, rows, columns}) => {

	return (
                <DataGrid
		    rows={rows}
                    columns={columns}
                    autoHeight
                    disableColumnMenu
                    disableSelectionOnClick
		    rowsPerPageOptions={[]}
                    sx={{ backgroundColor: "white", color: "336699", borderRadius: 2 }}
                />
	)

}


export default TableForm
