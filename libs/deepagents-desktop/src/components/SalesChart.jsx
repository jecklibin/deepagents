import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const SalesChart = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current);

      const option = {
        animation: true,
        tooltip: { trigger: 'axis' },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '10%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: ['比亚迪', '特斯拉', '蔚来', '小鹏', '理想', '极氪'],
          axisLine: { lineStyle: { color: '#e2e8f0' } },
          axisLabel: { color: '#64748b' },
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
          axisLabel: { color: '#64748b' },
        },
        series: [
          {
            data: [820, 932, 501, 434, 690, 330],
            type: 'bar',
            barWidth: '40%',
            itemStyle: {
              borderRadius: [6, 6, 0, 0],
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#3b82f6' },
                { offset: 1, color: '#60a5fa' },
              ]),
            },
            emphasis: { itemStyle: { color: '#2563eb' } },
          },
        ],
      };

      chartInstance.current.setOption(option);

      const handleResize = () => {
        chartInstance.current?.resize();
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chartInstance.current?.dispose();
      };
    }
  }, []);

  return <div ref={chartRef} className="w-full h-64" />;
};

export default SalesChart;
