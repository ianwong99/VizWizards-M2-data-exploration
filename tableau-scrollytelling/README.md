# Tableau Scrollytelling Project

This project is designed to create a scrollytelling page that embeds various Tableau visualizations. The page allows users to scroll through different visualizations seamlessly, providing an interactive experience.

## Project Structure

The project consists of the following files and directories:

- **src/**: Contains the source files for the project.
  - **index.html**: The main HTML document that sets up the structure of the scrollytelling page.
  - **css/**: Contains the styles for the scrollytelling page.
    - **styles.css**: Styles for layout, typography, and embedded visualizations.
  - **js/**: Contains JavaScript files for functionality.
    - **app.js**: Initializes Tableau visualizations and handles the embedding process.
    - **scroll-handler.js**: Manages scroll events for smooth transitions between visualizations.
  - **assets/**: Directory for assets (currently empty).
    - **.gitkeep**: Ensures the assets directory is tracked by version control.
  
- **package.json**: Configuration file for npm, listing dependencies and scripts for the project.

## Getting Started

To set up and run the project, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd tableau-scrollytelling
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Open the project**:
   Open `src/index.html` in your web browser to view the scrollytelling page.

## Embedding Tableau Visualizations

The project uses the Tableau JavaScript API to embed the following visualizations:

1. **Salary Visualizations**:
   - [Sheet 1](https://public.tableau.com/app/profile/myungjin.shin/viz/Salary_17628163110230/Sheet1?publish=yes)
   - [Sheet 3](https://public.tableau.com/app/profile/myungjin.shin/viz/Salary_17628163110230/Sheet3?publish=yes)

2. **Shots Dashboard**:
   - [Shot Chart Dashboard](https://public.tableau.com/app/profile/vedanth.sathwik.toduru.madabushi/viz/shots_viz/ShotChartDashboard?publish=yes)
   - [Trends Dashboard](https://public.tableau.com/app/profile/vedanth.sathwik.toduru.madabushi/viz/shots_viz/TrendsDashboard?publish=yes)
   - [Heatmap Dashboard](https://public.tableau.com/app/profile/vedanth.sathwik.toduru.madabushi/viz/shots_viz/HeatmapDashboard?publish=yes)

3. **3-Point Attempted Trends**:
   - [3 Points Attempted and Percentage Trend](https://public.tableau.com/app/profile/ian.wong5068/viz/TableauVisuals_17628169252610/3PointsAttemptedandPercentageTrend?publish=yes)
   - [3-Point Efficiency Animated by Year](https://public.tableau.com/app/profile/ian.wong5068/viz/TableauVisuals_17628169252610/Dashboard1?publish=yes)

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.