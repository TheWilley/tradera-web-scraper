//Puppeteer library
const pt = require('puppeteer')

// Bid is a bid on an auction
interface Bid {
    bidder: string;
    bid: number;
    time: number;
}

// BidInfo is the information that is available on the auction page
interface BidInfo {
    // Acution and seller information
    sellerName: string;
    isauction: boolean;
    acutionName: string;
    auctionStarted: boolean;
    auctionEnded: boolean;

    // Bid information
    allBids: Bid[];
    highestBid: number;
    numberOfBids: number;

    // Time information
    timeLeft: number;
    endTime: number;
    latestBidTime: number;
    latestBidder: string;

    // Buy now information
    buyNowPrice: number;
    buyNowAvailable: boolean;

    // Other information
    shippingPrice: number;
    description: string;
    images: string[];
}

async function selectorId() {
    //launch browser in headless mode
    const browser = await pt.launch()
    //browser new page
    const page = await browser.newPage();
    //launch URL
    await page.goto('https://www.tradera.com/item/343397/584081849/super-smash-bros-nytt-nintendo-wii-u-wii-u')
    //identify element with id
    const name = await page.evaluate(() => {
        const element = document.querySelector('.bid-details-amount');
        return (element as HTMLElement).innerText.replace(/\D/g, '');
    });
    // Log name innerText
    console.log(name)
    //wait for sometime
    await page.waitForTimeout(4000)
    //browser close
    await browser.close()
}
selectorId()