import { getProductInfo } from '../dist/tradera-web-scraper.js';

(async () => {
    const auctionInfo = await getProductInfo('https://www.tradera.com/item/123456789');
    console.log(auctionInfo);
})();