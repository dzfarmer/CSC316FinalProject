# A Student’s Sleep Cycle  
**CSC316 Final Project**

---

## Live Website
https://dzfarmer.github.io/CSC316FinalProject

## Screencast Video
[Paste your video link here]

---

## Project Overview

This project is an interactive data story about student sleep.

In daily student life, sleep is often the first thing we sacrifice.  
We stay up late, rely on coffee, sit for long hours, and try to catch up on sleep during weekends.  

Instead of viewing sleep as the result of a single factor, this project explores how multiple everyday behaviors interact and collectively influence sleep quality.

The project is designed as a **scrolling narrative with eight panels**.  
Each panel introduces part of the story, and clicking the image opens an interactive visualization.

---

## How to Run

To run the project locally:

- Open the project folder  
- Launch a local server (we used Live Server)  
- Open `index.html`  

**Main entry point:**  
- `index.html`

---

## Project Structure

### Main Page
- `index.html`  
  Main story page with narrative flow and interactions.

---

### JavaScript
- `js/main.js`  
  Controls scrolling, modal interactions, and chart loading.
- `js/cartoon_clock.js`  
  Weekday vs weekend sleep visualization.
- `js/caffeineHeatmap.js`  
  Heatmap for caffeine and sleep.
- `js/seesaw.js`  
  BMI and sleep visualization.
- `js/sleep-score.js`  
  Interactive sleep score simulator.
- `js/sleepRadar.js`  
  Behavioral balance radar chart.

---

### Visualization Pages
Each file is loaded into the modal as an interactive chart:

- `cartoon_clock.html`
- `heatmap.html`
- `sedentary.html`
- `night.html`
- `seesaw.html`
- `loop.html`
- `radar.html`
- `simulator.html`

---

### Styles
- `css/styles.css` – main layout and UI  
- `css/cartoon_clock.css`  
- `css/heatmap.css`  
- `css/radar.css`  
- `css/seesaw.css`

---

### Data
- `data/nhanes_2017_mar2020_sleep_merged_extended_clean_with_caffeine.csv`  
  Main dataset (based on NHANES 2017–March 2020)
- `project.csv`  
  Processed dataset used in visualizations

---

### Assets
- `assets/images/`  
  Story panel images and visual elements

---

## Libraries and Resources

- **D3.js** – interactive visualizations  
- **Google Fonts (Plus Jakarta Sans)** – typography  

All HTML, CSS, JavaScript, and visualization logic were created by our team.

---

## Notes

- The project is designed as a **narrative data story**, not isolated charts  
- Users scroll through panels and interact with each visualization  
- Charts are loaded dynamically using **iframes inside a modal**
