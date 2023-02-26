//Puppeteer library
const pt = require("puppeteer");
let browserInstance: Page;

// Bid is a bid on an auction
interface Bid {
    bidder: string;
    bid: number;
    time: string;
}

// AuctionInfo is the information that is available on the auction page
interface AuctionInfo {
    // Acution and seller information
    sellerName: string;
    isAuction: boolean;
    aucutionName: string;
    auctionEnded: boolean;

    // Bid information
    allBids: Bid[];
    highestBid: number;
    latestBid: Bid
    numberOfBids: number;

    // Time information
    timeLeft: number;
    endTime: number;

    // Buy now information
    buyNowPrice: number;
    buyNowAvailable: boolean;

    // Other information
    description: string;
    images: string[];
}

/**
 * Helper functions for puppeteer
 * @returns A helper object with functions that can be used to get information from the auction page
 */
function puppeteerHelper() {
    return {
        getSelectorText: async (selector: string, callback?: (_result_: string) => unknown) => {
            try {
                const _result_ = await browserInstance.evaluate((selector: string) => {
                    const element = document.querySelector(selector);

                    return (element as HTMLElement).innerText;
                }, selector);

                // Check if callback is defined and return result
                if (callback)
                    return callback(_result_);
                else
                    return _result_;
            } catch (e) {
                console.log("Could not get selector text");
            }

        },
        getAllBids: async (callback?: (_result_: Bid[]) => unknown) => {
            // Open bid history
            await browserInstance.click(".bid-details-bids-title > span > a");
            await browserInstance.waitForSelector(".bid-details-bids-title > span > a");

            // Wait for bid history to load and get all bids
            const _result_ = await browserInstance.evaluate(() => {
                const bids: Bid[] = [];
                const bidElements = document.querySelectorAll(".table-fixed > tbody > tr");
                bidElements.forEach((element: HTMLElement) => {
                    const bidder = (element.children[0] as HTMLElement).innerText;
                    const bid = (element.children[1] as HTMLElement).innerText;
                    const time = (element.children[3] as HTMLElement).innerText;

                    bids.push({
                        bidder: bidder,
                        bid: parseFloat(bid.replace("kr", "")),
                        time: time
                    });
                });

                return bids;
            });

            // Check if callback is defined and return result
            if (callback)
                return callback(_result_);
            else
                return _result_;
        },
        async getAllImages() {
            const _result_ = await browserInstance.evaluate(() => {
                const images: string[] = [];
                const imageElements = document.querySelectorAll(".image-gallery-item__image");
                imageElements.forEach((element: HTMLImageElement) => {
                    images.push(element.src);
                });

                return images;
            });

            return _result_;
        }
    };
}

/**
 * Setup the browser instance
 */
async function setup() {
    // Check if page url contains "item" and exit if not
    if (!browserInstance.url().includes("item")) {
        console.log("Not an auction page (page might have been removed)");
        process.exit(0);
    }

    // Attempt to accept cookies
    try {
        await browserInstance.waitForSelector("#qc-cmp2-ui > div.qc-cmp2-footer.qc-cmp2-footer-overlay.qc-cmp2-footer-scrolled > div > button.css-14ubilm");
        await browserInstance.click("#qc-cmp2-ui > div.qc-cmp2-footer.qc-cmp2-footer-overlay.qc-cmp2-footer-scrolled > div > button.css-14ubilm");
    } catch (e) {
        console.log("Could not click accept cookies");
    }
}

/**
 * Start browser instance
 * @param auction_url The url to the auction
 */
async function startBrowser(auction_url: string) {
    //launch browser in headless mode
    const browser = await pt.launch();
    //browser new page
    const page = await browser.newPage();
    //launch URL
    await page.goto(auction_url);
    // Set browser instance
    browserInstance = page;

    // Wait for setup to finish
    await setup();
}

/**
 * Get auction information
 */
async function getAuctionInfo() {
    await startBrowser("https://www.tradera.com/item/344630/583933118/miitopia-nintendo-switch-");

    // TODO: Make all selectors use jsselector from chromiun dev tools instead of css selectors (they are more reliable)
    const auctionInfo: AuctionInfo = {
        sellerName: await puppeteerHelper().getSelectorText(".seller-alias"),
        isAuction: await puppeteerHelper().getSelectorText(".bid-details-bids-title", (result) => { return result.includes("Bud") ? true : false; }),
        aucutionName: await puppeteerHelper().getSelectorText("#view-item-main"),
        auctionEnded: await puppeteerHelper().getSelectorText(".my-auto > .heading-london", (result) => { return result.includes("Avslutad") ? true : false; }),
        allBids: await puppeteerHelper().getAllBids(),
        numberOfBids: (await puppeteerHelper().getAllBids()).length,
        highestBid: await puppeteerHelper().getSelectorText(".bid-details-amount > span > span", (result) => { return Number(result.replace(/[^0-9.]/g, "")); }),
        timeLeft: await puppeteerHelper().getSelectorText("#collapsed_auction_details > div > aside > div.separators_sm-separator__lOmzL.pb-md-2.mb-md-2 > section.bid-details.d-flex.flex-md-column.justify-content-between.py-1.pt-md-0.pb-md-2 > div.d-flex.flex-column.flex-md-row.justify-content-between.mb-md-2.text-center > div.my-auto > p > span", (result) => { return result != "Avslutad" ? result : 0; }),
        latestBid: await puppeteerHelper().getAllBids((result) => { return result[0]; }),
        buyNowPrice: await puppeteerHelper().getSelectorText("button.btn-md:nth-child(3)", (result) => { return Number(result.replace(/[^0-9.]/g, "")); }),
        buyNowAvailable: await puppeteerHelper().getSelectorText("button.btn-md:nth-child(3)", (result) => { return result == undefined ? false : true; }),
        description: await puppeteerHelper().getSelectorText(".overflow-hidden.text-break.position-relative"),
        images: await puppeteerHelper().getAllImages(),
        endTime: await puppeteerHelper().getSelectorText("#collapsed_auction_details > div > aside > div.separators_sm-separator__lOmzL.pb-md-2.mb-md-2 > section.bid-details.d-flex.flex-md-column.justify-content-between.py-1.pt-md-0.pb-md-2 > div.d-flex.flex-column.flex-md-row.justify-content-between.mb-md-2.text-center > div.mb-1.mb-md-0 > p", (result) => { return result.replace("Avslutas ", ""); })
    };

    console.log(auctionInfo);
    process.exit(0);
}

getAuctionInfo();