

A Student’s Sleep Cycle
CSC316 Final Project

Live Website
https://dzfarmer.github.io/CSC316FinalProject

Screencast Video
[Paste your video link here]

----------------------------------------
Project Overview

This project is an interactive data story about student sleep.

In daily student life, sleep is often the first thing we sacrifice. 
We stay up late, rely on coffee, sit for long hours, and try to catch up on sleep during weekends. 
Instead of looking at sleep as a result of a single factor, this project explores how multiple everyday behaviors interact and collectively influence sleep quality.

The project is designed as a scrolling narrative with eight panels. 
Each panel introduces part of the story, and clicking the image opens an interactive visualization.

----------------------------------------
How to Run

To run the project locally:
- Open the project folder
- Launch a local server (we used Live Server)
- Open index.html

The main entry point is:
- index.html

----------------------------------------
Project Structure

Main Page
- index.html  
  The main story page that contains the narrative and navigation.

JavaScript
- js/main.js  
  Handles scrolling behavior, modal interactions, and chart loading.
- js/cartoon_clock.js  
  Weekday vs weekend sleep clock visualization.
- js/caffeineHeatmap.js  
  Heatmap showing caffeine use and sleep patterns.
- js/seesaw.js  
  BMI and sleep relationship visualization.
- js/sleep-score.js  
  Interactive sleep score simulator.
- js/sleepRadar.js  
  Radar chart summarizing behavioral balance.

Visualization Pages
- cartoon_clock.html  
- heatmap.html  
- sedentary.html  
- night.html  
- seesaw.html  
- loop.html  
- radar.html  
- simulator.html  

Each of these pages contains one interactive visualization, which is loaded into the modal.

Styles
- css/styles.css  
  Main styling for layout and components.
- css/cartoon_clock.css  
- css/heatmap.css  
- css/radar.css  
- css/seesaw.css  

Assets
- assets/images/  
  All images used for the story panels and visual design.

Data
- data/nhanes_2017_mar2020_sleep_merged_extended_clean_with_caffeine.csv  
  Main dataset used for visualization (based on NHANES 2017–March 2020).

----------------------------------------
Libraries and Resources

We used:
- D3.js for building interactive visualizations
- Google Fonts (Plus Jakarta Sans) for typography

All HTML, CSS, JavaScript, visual design, and interaction logic were created by our team.

----------------------------------------
Notes

- The project is structured as a narrative experience rather than separate charts.
- Users scroll through the story and interact with each panel.
- Charts are loaded dynamically using iframes in a modal.
