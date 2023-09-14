import { Component, OnDestroy } from '@angular/core';
import { ChartComponentLike, ChartData, ChartOptions } from 'chart.js';
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

interface Listing {symbol: string, name: string, min: number}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {
  selectedListing!: Listing;
  listings: Listing[] = [
    {
      symbol: 'IBM',
      name: 'IBM',
      min: 146
    },
    {
      symbol: 'ORCL',
      name: 'Oracle',
      min: 109.5
    },
    {
      symbol: 'GOOG',
      name: 'Google',
      min: 135
    }
  ]
  title = 'SID-Data-Visualisation';
  feed: any = {};
  colors: string[] = [];
  data!: any;
  subsciptions = new Subscription();

  constructor(
    private http: HttpClient,
  ) {
    this.fetchStockFeed(this.listings[0]);
  }

  fetchStockFeed(selectedListing: Listing) {
    this.selectedListing = selectedListing;
   const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${this.selectedListing.symbol}&interval=5min&apikey=${environment.APIKEY}`;
   
  //  this.subsciptions.unsubscribe()

    this.subsciptions.add(this.http.get(url)
      .subscribe(
        {
          next: (res: any) => {
            this.feed = res['Time Series (5min)']
            this.setChartData();
          }
        }
      ))

    this.subsciptions.add(
      interval(300000)
        .subscribe({
          next: () => {
            this.subsciptions.add(this.http.get(url)
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

  options!: ChartOptions;

  setChartData() {
    this.data = undefined;

    this.options = {
      responsive: true,
      backgroundColor: '#000',
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: `Floating Bar Chart Displaying ${this.selectedListing?.name}'s Stock Pricing`
        }
      },
      scales: {
        y: {
          min: this.selectedListing?.min,
          suggestedMin: this.selectedListing?.min,
          grid: {
            display: true,
            color: '#313131',
            drawBorder: false,
            lineWidth: 3
          },
          ticks: {
            display: false
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
;
    const gains = Object.values(this.feed).filter((item: any) => {
      return parseFloat(item['4. close']) > parseFloat(item['1. open'])
    })

    const loses = Object.values(this.feed).filter((item: any) => {
      return parseFloat(item['1. open']) > parseFloat(item['4. close'])
    })

    const filteredLabel = [];

    for(let item in this.feed) {
      if(parseFloat(this.feed[item]['1. open']) !== parseFloat(this.feed[item]['4. close'])) {
        filteredLabel.push(item)
      }
    }


    console.log(filteredLabel.length, gains.length, loses.length)
    this.data = {
      labels: filteredLabel,

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
