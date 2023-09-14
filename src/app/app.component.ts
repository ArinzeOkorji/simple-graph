import { Component, OnDestroy } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { environment } from 'src/environment/environment';
import { HttpClient } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';

interface raw {
  open: string,
  high: string,
  low: string,
  close: string,
  volume: string,
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {
  title = 'SID-Data-Visualisation';
  feed: {} = {};
  colors: string[] = [];
  data!: ChartData;
  subsciptions = new Subscription();
  url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=${environment.APIKEY}`;

  constructor(
    private http: HttpClient,
  ) {
    this.subsciptions.add(this.http.get(this.url)
            .subscribe(
              {
                next: (res: any) => {
                  this.feed = res['Time Series (5min)']
                  this.setChartData();
                }
              }
            ))
    this.fetchStockFeed();
  }

  fetchStockFeed() {


    this.subsciptions.add(
      interval(300000)
        .subscribe({
          next: () => {
            this.subsciptions.add(this.http.get(this.url)
            .subscribe(
              {
                next: (res: any) => {
                  this.feed = res['Time Series (5min)']
                  this.setChartData();
                }
              }
            ))
          }
        })
    )
  }

  options: ChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Floating Bar Chart Displaying IBM\'s Stock Pricing'
      }
    },
    scales: {
      y: {
        min: 145,
        suggestedMin: 0
      },
      // x:{
      //   labels: n
      // }
    }
  }

  setChartData() {
    const gains = Object.values(this.feed).filter((item: any) => {
      return parseFloat(item['4. close']) > parseFloat(item['1. open'])
    })

    const loses = Object.values(this.feed).filter((item: any) => {
      return parseFloat(item['1. open']) > parseFloat(item['4. close'])
    })

    this.data = {
      labels: Object.keys(this.feed),

      datasets: [
        {
          label: 'Gains',
          data: gains.map((item: any) => {
            return [parseFloat(item['1. open']), parseFloat(item['4. close'])];
          }),
          backgroundColor: 'green'
        },
        {
          label: 'Loses',
          data: loses.map((item: any) => {
            return [parseFloat(item['1. open']), parseFloat(item['4. close'])];
          }),
          backgroundColor: 'red'
        },
      ],
    }
  }

  ngOnDestroy(): void {
    this.subsciptions.unsubscribe();
  }

}
