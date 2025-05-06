# DNS Analysis Tool Project Specification

## Project Overview

Create a web-based DNS log analysis tool that processes and visualizes DNS query logs from RouterOS and NextDNS. The tool should help network administrators identify patterns, suspicious domains, and blocked queries in their DNS traffic.

## Core Requirements

1. **Log Processing**:

   - Process RouterOS log files containing DNS queries (sample attached, `routeros-sample.log`)
   - Process NextDNS CSV export files (sample attached, `nextdns-sample.csv`)
   - Optionally process a list of regexes (sample attached, `blocklist-sample.txt`) of a blocklist, to detect suspicious domains
   - Extract key information: timestamps, domains, client IPs, query types, and query status (blocked/allowed)

2. **Data Analysis**:

   - Analyze domain frequency and patterns
   - Track blocked queries and reasons
   - Identify suspicious domains based on patterns
   - Analyze device/client activity
   - Generate time-series data for visualization

3. **Visualization**:

   - Display device activity with query counts and blocked percentages
   - Show time-series charts of DNS activity
   - Provide detailed tables of domains and devices
   - Allow filtering and searching of results
   - Do not display the full data, to avoid slowing down the browser

4. **Architecture**:
   - Use a Python script for preprocessing log files
   - Create a Next.js web application for visualization
   - Implement a clean, responsive UI with dark mode support and dark mode by default

## Technical Details

### Python Script

The Python script (`dns-analysis.py`) is attached. It should:

1. Accept RouterOS logs and NextDNS CSV exports as input
2. Parse and normalize the data from both sources
3. Perform analysis on domains, devices, and time patterns
4. Generate a JSON output file with the processed data
5. Include detailed error handling and logging

It should be saved into `public/` and loaded dynamically when needed for display, copying, or download.

It should be displayed in a toggleable section, with buttons to copy it and download it.

Invocation: `python dns-analysis.py --routeros router.log --nextdns nextdns.csv --blocklist blocklist.txt --output analysis.json`

Invocation instructions should be included, with a button to copy them to the clipboard.

The Python script has problems which need to be addressed: `blocked_count` is always 0. The NextDNS log is being misread. You should use a proper CSV library to read it instead of regexes.

Include instructions to -

1. Download the Python script below
2. Install Python 3.6+ if you don't have it already
3. Run the script with your log files as shown in the example below
4. Upload the generated JSON file to this page

### Web Application

The Next.js application should:

1. Allow users to upload pre-processed JSON data
2. Display visualizations using Recharts
3. Provide filtering and search capabilities
4. Implement responsive design for all screen sizes
5. Include dark mode support

## Implementation History & Challenges

The project has gone through several iterations addressing these challenges:

1. **Log Parsing**: Initially struggled with parsing RouterOS logs due to varying formats. Implemented multiple regex patterns with fallbacks.

2. **NextDNS CSV Handling**: Had issues with the NextDNS CSV format, particularly with quoted fields containing commas. Switched to using the CSV library for more reliable parsing.

3. **Blocked Query Detection**: Fixed issues with detecting blocked queries by normalizing status fields and adding explicit checks for 'blocked' status.

4. **Device Analysis**: Enhanced the device analysis to properly count blocked queries and calculate percentages.

5. **UI Components**: Created responsive visualization components that handle edge cases like no blocked queries.

## Current Components

1. **Python Script** (`dns-analysis.py`): Handles log processing and analysis
2. **Device Breakdown Component**: Visualizes device activity with charts and tables
3. **Main Page**: Integrates the components and handles data loading

## Future Enhancements

1. **Device Name Mapping**: Allow users to map IP addresses to friendly device names
2. **Domain Categorization**: Categorize domains by type (advertising, tracking, malware)
3. **Time-based Filtering**: Filter analysis by time periods
4. **Export Functionality**: Allow exporting results as CSV or PDF
5. **Real-time Monitoring**: Add support for real-time log monitoring

## Implementation Notes

- The Python script should be run first to preprocess the logs, guide the user through this
- The web application only handles the visualization of the preprocessed data
- Ensure proper error handling for various log formats
- Add extensive debugging to help diagnose parsing issues
