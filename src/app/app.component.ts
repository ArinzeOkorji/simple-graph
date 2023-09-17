import { Component, Inject, LOCALE_ID, OnDestroy } from '@angular/core';
import { ChartComponentLike, ChartData, ChartOptions } from 'chart.js';
import { environment } from 'src/environment/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription, forkJoin, interval } from 'rxjs';

interface raw {
  open: string,
  high: string,
  low: string,
  close: string,
  volume: string,
}

interface Listing { symbol: string, name: string, min: number, price: number, move: string }

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
      min: 145.5,
      price: 0,
      move: 'loss'
    },
    {
      symbol: 'ORCL',
      name: 'Oracle',
      min: 113.3,
      price: 0,
      move: 'loss'
    },
    {
      symbol: 'GOOG',
      name: 'Google',
      min: 138,
      price: 0,
      move: 'loss'
    }
  ]
  title = 'SID-Data-Visualisation';
  feed: any = [];
  colors: string[] = [];
  data!: any;
  subsciptions = new Subscription();
  httpArray: Observable<any>[] = [];
  intervalTime = 300000;
  locales:any = [
   { name:"English(US)",code:"en-US"},
    {name:"French(France)",code:"fr-FR"}
   ]

  selectedLocale: string;

  constructor(
    private http: HttpClient,
    @Inject(LOCALE_ID) private localeId: string
  ) {
    this.fetchStockFeed(this.listings[1]);
    this.fetchListingPrices();
    this.selectedLocale = this.localeId
  }

  fetchStockFeed(selectedListing: Listing) {
    this.selectedListing = selectedListing;
    const url = `https://api.twelvedata.com/time_series?symbol=${this.selectedListing.symbol}&interval=1min&apikey=${environment.APIKEY}`;


    this.subsciptions.add(this.http.get(url)
      .subscribe(
        {
          next: (res: any) => {
            this.feed = res['values']
            this.setChartData();
          }
        }
      ))

    this.subsciptions.add(
      interval(this.intervalTime)
        .subscribe({
          next: () => {
            this.subsciptions.add(this.http.get(url)
              .subscribe(
                {
                  next: (res: any) => {
                    this.feed = res['values']
                    this.setChartData();
                  }
                }
              ))
          }
        })
    )
  }

  changeLanguage(code:string){
    location.replace(`/${code}/`);
    }

  fetchListingPrices() {

    this.listings.forEach(list => {
      const url = `https://api.twelvedata.com/price?symbol=${list.symbol}&apikey=${environment.APIKEY}`;
      const http = this.http.get(url);

      this.httpArray.push(http)
    })

    this.subsciptions.add(
      interval(this.intervalTime)
        .subscribe(
          {
            next: () => {
              forkJoin(this.httpArray)
                .subscribe({
                  next: (res) => {

                    if (res.length === this.listings.length) {
                      for (let i = 0; i < res.length; i++) {
                        const newPrice = parseInt(res[i]['price']);

                        this.listings[i].move = this.listings[i].price > newPrice ? 'loss' : 'gain';
                        this.listings[i].price = newPrice;

                      }
                    }
                  }
                })
            }
          }
        )
    )

    this.subsciptions.add(
      forkJoin(this.httpArray)
        .subscribe({
          next: (res) => {

            if (res.length === this.listings.length) {
              for (let i = 0; i < res.length; i++) {
                const newPrice = parseInt(res[i]['price']);

                this.listings[i].move = this.listings[i].price > newPrice ? 'loss' : 'gain';
                this.listings[i].price = newPrice;

              }
            }
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

    const gains = this.feed.filter((item: any) => {
      return parseFloat(item['close']) > parseFloat(item['open'])
    })

    const loses = this.feed.filter((item: any) => {
      return parseFloat(item['open']) > parseFloat(item['close'])
    })

    const filteredLabel = [];

    const backgroundColors = [];
    for (let item in this.feed) {
      if (parseFloat(this.feed[item]['open']) !== parseFloat(this.feed[item]['close'])) {
        parseFloat(this.feed[item]['open']) > parseFloat(this.feed[item]['close']) ? backgroundColors.push('red') : backgroundColors.push('green');
        const formatedTime = new Date(this.feed[item]['datetime']).toLocaleTimeString()
        filteredLabel.push(formatedTime)
      }
    }


    this.data = {
      labels: filteredLabel,

      datasets: [
        {
          label: 'Gains',
          data: this.feed.map((item: any) => {
            return [parseFloat(item['open']), parseFloat(item['close'])];
          }),
          backgroundColor: backgroundColors
        },
        {
          label: 'Loses',
          data: '',
          backgroundColor: 'red'
        },
      ],
    }
  }

  ngOnDestroy(): void {
    this.subsciptions.unsubscribe();
  }

}
