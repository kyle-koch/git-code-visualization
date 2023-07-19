import './Main.css';
import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
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

  const [chartName, setChartName] = useState('Pull Requests');
  const [sourceData, setSourceData] = useState(pulls);
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

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
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  useEffect(() => { //a monsterous useEffect actually deserves comments
    if (sourceData !== undefined) {
      const quarterLanguageTotals = sourceData.reduce((totals, item) => {
        const { name, year, quarter, count } = item;
        const yearQuarter = `${year}-${quarter}`;
        const languageTotal = totals[yearQuarter] || { total: 0, languages: {} };
        languageTotal.total += parseInt(count, 10);
        languageTotal.languages[name] = (languageTotal.languages[name] || 0) + parseInt(count, 10);
        totals[yearQuarter] = languageTotal;
        return totals; //calculates the total count for each language in each quarter
      }, {});
      const sortedQuarters = Object.keys(quarterLanguageTotals).sort();
      const topLanguages = Object.entries(quarterLanguageTotals[sortedQuarters[sortedQuarters.length - 1]].languages)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 15)
        .map(([language]) => language); //get the top 15 languages based on last quarter total count

      const filteredData = sourceData.filter((item) => topLanguages.includes(item.name));
      //filter sourceData to include only the data for the top 15 languages by count

      const chartDatasets = constructDatasets(filteredData);
      const uniqueYearQuarter = [...new Set(filteredData.map((item) => `${item.year}-${item.quarter}`))];
      //construct datasets and labels for the chart w/ filtered data

      chartDatasets.forEach((dataset) => {
        dataset.data = uniqueYearQuarter.map((yearQuarter) => {
          const [year, quarter] = yearQuarter.split('-');
          const languageTotal = quarterLanguageTotals[yearQuarter];
          const percentage = (dataset.label in languageTotal.languages)
            ? ((languageTotal.languages[dataset.label] / languageTotal.total) * 100).toFixed(2)
            : 0;
          return percentage;
        }); //update the chart datasets w/ calculated percentages for each quarter
      });

      setChartData({
        labels: uniqueYearQuarter,
        datasets: chartDatasets,
      });
    }
  }, [sourceData]);

  const handleDataChange = (data, name) => {
    setSourceData(data);
    setChartName(name);
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: `${chartName}`,
      },
    },
    scales: {
      x: {
        ticks: {
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
        ticks: {
          callback: (value) => `${value}%`,
        },
      },
    },
  };

  return (
    <div>
      <h1>Top 15 Languages on GitHub</h1>
      <div className="chart-container">
        <Line data={chartData} options={options} />
        <div className="button-container"> {/* TODO: Style these bitches */}
          <button onClick={() => handleDataChange(pulls, 'Pull Requests')}>Pull Requests</button>
          <button onClick={() => handleDataChange(pushes, 'Pushes')}>Pushes</button>
          <button onClick={() => handleDataChange(issues, 'Issues')}>Issues</button>
          <button onClick={() => handleDataChange(stars, 'Stars')}>Stars</button>
        </div>
      </div>
    </div>
  );
  
}

export default Main;


