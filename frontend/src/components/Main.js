import './Main.css';
import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import RangeSlider from 'react-bootstrap-range-slider';
import issues from '../pseudo-backend/gh-issue-event.json';
import pulls from '../pseudo-backend/gh-pull-request.json';
import pushes from '../pseudo-backend/gh-push-event.json';
import stars from '../pseudo-backend/gh-star-event.json';

function Main() {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );
  ChartJS.defaults.color = '#E6E6E6';
  ChartJS.defaults.font.size = 22;

  const [chartName, setChartName] = useState('Pull Requests');
  const [sourceData, setSourceData] = useState(pulls);
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [numLanguages, setNumLanguages] = useState(10);
  const [hoveredDatasetIndex, setHoveredDatasetIndex] = useState(null);

  const constructDatasets = (data) => {
    const datasets = [];
    const uniqueLanguages = [...new Set(data.map((item) => item.name))];

    uniqueLanguages.forEach((language) => {
      const languageData = data.filter((item) => item.name === language);
      const label = language;
      const countsByYearQuarter = {};

      languageData.forEach((item) => {
        const { year, quarter, count } = item;
        const yearQuarter = `${year} - Q${quarter}`;
        countsByYearQuarter[yearQuarter] = parseInt(count, 10);
      });

      const counts = Object.values(countsByYearQuarter);
      datasets.push({
        label,
        data: counts,
        fill: false,
        borderColor: getRandomColor(),
      });
    });
    return datasets;
  };

const getRandomColor = () => {
  const randomChannel = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  return `#${randomChannel()}${randomChannel()}${randomChannel()}`;
};

  useEffect(() => {
    if (sourceData !== undefined) {
      const quarterLanguageTotals = sourceData.reduce((totals, item) => {
        const { name, year, quarter, count } = item;
        const yearQuarter = `${year}-${quarter}`;
        const languageTotal = totals[yearQuarter] || { total: 0, languages: {} };
        languageTotal.total += parseInt(count, 10);
        languageTotal.languages[name] = (languageTotal.languages[name] || 0) + parseInt(count, 10);
        totals[yearQuarter] = languageTotal;
        return totals;
      }, {});
  
      const sortedQuarters = Object.keys(quarterLanguageTotals).sort();
      const topLanguages = Object.entries(quarterLanguageTotals[sortedQuarters[sortedQuarters.length - 1]].languages)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, numLanguages)
        .map(([language]) => language);
  
      const filteredData = sourceData.filter((item) => topLanguages.includes(item.name));
  
      const chartDatasets = constructDatasets(filteredData);
      const uniqueYearQuarter = [...new Set(filteredData.map((item) => `${item.year}-${item.quarter}`))];
  
      chartDatasets.forEach((dataset) => {
        dataset.data = uniqueYearQuarter.map((yearQuarter) => {
          const [year, quarter] = yearQuarter.split('-');
          const languageTotal = quarterLanguageTotals[yearQuarter];
  
          const totalForSelectedLanguages = Object.entries(languageTotal.languages)
            .filter(([language]) => topLanguages.includes(language))
            .reduce((total, [, count]) => total + count, 0);
  
          const percentage = (dataset.label in languageTotal.languages)
            ? ((languageTotal.languages[dataset.label] / totalForSelectedLanguages) * 100).toFixed(2)
            : 0;
  
          return percentage;
        });
      });
  
      setChartData({
        labels: uniqueYearQuarter,
        datasets: chartDatasets,
      });
    }
  }, [sourceData, numLanguages]);

  const handleDataChange = (data, name, numLanguages) => {
    setSourceData(data);
    setChartName(name);
  };

  const options = {
    responsive: true,
    hoverBorderWidth: 14,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: `${chartName}`,
        font: {
          size: 28
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 14,
          },
          callback: (value, index, values) => {
            const label = chartData.labels[index];
            const [year, quarter] = label.split('-');
            const prevLabel = chartData.labels[index - 1];
            const [prevYear] = prevLabel ? prevLabel.split('-') : [];
            return year !== prevYear ? `${year} - Q${quarter}` : '';
          },
        },
      },
      y: {
        title: {
          display: true,
          text: 'Percentage Share for Number of Languages Chosen',
          font: {
            size: 18,
          },
        },
        ticks: {
          callback: (value) => `${value}%`,
        },
      },
    },
    onHover: (event, elements) => {
      if (elements.length > 0) {
        const hoveredDatasetIndex = elements[0].datasetIndex;
        setHoveredDatasetIndex(hoveredDatasetIndex);
      } else {
        setHoveredDatasetIndex(null);
      }
    },
  };

const getFadedColor = (color, opacity) => {
  const r = parseInt(color.substring(1, 3), 16);
  const g = parseInt(color.substring(3, 5), 16);
  const b = parseInt(color.substring(5, 7), 16);
  const rgbaColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
  return rgbaColor;
};

const fadedDatasets = chartData.datasets.map((dataset, index) => {
  const fadedBorderColor = dataset.borderColor ? getFadedColor(dataset.borderColor, 0.5) : 'rgba(0, 0, 0, 0.5)';
  const fadedBackgroundColor = dataset.backgroundColor ? getFadedColor(dataset.backgroundColor, 0.1) : 'rgba(0, 0, 0, 0.1)';
  return {
    ...dataset,
    borderColor: hoveredDatasetIndex === null || hoveredDatasetIndex === index ? dataset.borderColor : fadedBorderColor,
    backgroundColor: hoveredDatasetIndex === null || hoveredDatasetIndex === index ? dataset.backgroundColor : fadedBackgroundColor,
  };
});

  const chartDataWithStyle = {
    ...chartData,
    datasets: chartData.datasets.map((dataset, index) => ({
      ...dataset,
      borderWidth: hoveredDatasetIndex === index ? 12 : 4,
      borderColor: hoveredDatasetIndex === index ? dataset.borderColor : fadedDatasets[index].borderColor,
      backgroundColor: hoveredDatasetIndex === index ? dataset.backgroundColor : fadedDatasets[index].backgroundColor,
    })),
  };

  return (
    <>
      <h2>Most Popular Languages on GitHub</h2>
      <div className='slider'>
        <p>Show Top {numLanguages} Languages:</p>
        <RangeSlider
          value={numLanguages}
          onChange={(e) => setNumLanguages(e.target.value)}
          min={2}
          max={50}
          step={1}
          tooltip='off'
          size='lg'
        /><br />
      </div>
      <div className="chart-container">
        <Line data={chartDataWithStyle} options={options} />
        <div className="button-container">
          <p>View by:</p>
          <button className='coolButts' onClick={() => handleDataChange(pulls, 'Pull Requests')}>Pull Requests</button>
          <button className='coolButts' onClick={() => handleDataChange(pushes, 'Pushes')}>Push Events</button>
          <button className='coolButts' onClick={() => handleDataChange(issues, 'Issues')}>Issue Events</button>
          <button className='coolButts' onClick={() => handleDataChange(stars, 'Stars')}>Star Events</button>
        </div>
      </div>
      <p className='credit'>Data provided by:&nbsp;
      <a href='https://madnight.github.io/githut/' target='_blank' rel='noopener noreferrer'>GitHut 2.0</a></p>
    </>
  );
  
}

export default Main;