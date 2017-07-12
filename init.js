'use strict';

// First, load node's HTTP module, which we'll need to fetch content from wikipedia.
const https = require('https');

// Next, load cheerio, which is a jQuery implementation for node. 
const cheerio = require('cheerio');

// We use lodash for set operations.
const _ = require('lodash');

// This is the URL of the page that links to all "Polizeiruf 110" episodes.
const wikipedia_base_url = 'https://de.wikipedia.org';
const episode_list_url = `${wikipedia_base_url}/wiki/Liste_der_Polizeiruf-110-Folgen`;

/**
 * Fetch textual data from a remote URL.
 * @param {string} url - The URL of the resource to fetch.
 * @returns {Promise} A Promise that resolves to a string containing the 
 * fetched data, or is rejected with an Error object on failure.
 */
function get_async(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
            }
            else {
                const error = new Error(`Request failed with status code ${res.statusCode}.`);
                reject(error);
            }
        });
    });
}

/**
 * Fetch textual data from an array of remote URLs.
 * @param {Array[string]} urls - An array of URLs of the resource to fetch.
 * @returns {Array[Promise]} An array of promises that resolve to strings containing 
 * the fetched data, or are rejected with an Error object on failure.
 */
function get_many_async(urls) {
    return _.map(urls, get_async);
}

/**
 * Scrapes an HTML document for links to "Polizeiruf 110" episodes, making
 * some (probably unsound) assumptions in the process :-)
 * @param {string} html - The HTML document to scrape.
 * @returns {Array[string]} An array of URLs.
 * @throws {string} An error message if scraping failed.
 */
function scrape_episode_urls(html) {
    if (typeof html !== 'string' || !html.length) {
        throw 'Must be called with a non-empty string.';
    }

    const $ = cheerio.load(html);
    let urls = [];
    $('table.wikitable>tr>td:nth-child(2)>a')
        .each((i, elem) => {
            const url = $(elem).attr('href');
            const fullUrl = `${wikipedia_base_url}${url}`;
            urls.push(fullUrl);
        });
    return urls;
}

/**
 * Scrapes an HTML document for production data.
 * @param {string} html - The HTML document to scrape.
 * @returns {string} The production data.
 */
function scrape_production_data(html) {

// cheerio to webscrape    
const $ = cheerio.load(html);
const episode = 'Folge';
const folgeRegex = RegExp(episode + ".*" + "\d", "g");
const episodeFind = $('td').text();
const episodeAnswer = episodeFind.match(folgeRegex);
if (episodeAnswer === null) {
    console.log('Folgenummer nicht bekannt');
} console.log(episodeAnswer);



// these 2 const are to remove the rest of text from the title to just return the name of the episode.
    const polizeiTitle = 'Polizeiruf 110: ';
    const polizeiEndTitle = ' – Wikipedia';    
// then scrape the 'title' element into the const title    
    const title = $('title').text();    
    const newerTitle = title.replace(polizeiTitle,'').replace(polizeiEndTitle,'');
    const gedreht = ' gedreht.';
// make a new RegExp to find the sentence where it was filmed. sentence ends with 'gedreht.'     
    const fullSentence = RegExp(newerTitle + ".*" + gedreht, "g");
//search html document for that sentence    
    const htmlText = $('html').html();
    const matches = htmlText.match(fullSentence);
    if (matches === null) {
         console.error('Es gibt keine Info über den Drehort für "' + newerTitle + '".');
       
    } 

    return matches;
     
}    
      
    

  


/**
 * Scrape many HTML documents for production data.
 * @param {Array[Promise]} promises - An array of promises that each 
 * resolve to an HTML string on success, or are rejected on failure.
 * @returns {Array[Promise]} An array of promises that each resolve to
 * production data on success, or are rejected on failure.
 */
function scrape_many_production_data(promises) {
    return _.map(promises, (p) => new Promise((resolve, reject) => p.then((html) => {
        const prod_data = scrape_production_data(html);
        resolve(prod_data);
    })));
}

// The actual program logic.
get_async(episode_list_url)
    .then(scrape_episode_urls)
    .then(get_many_async)
    .then(scrape_many_production_data)
    .then((promises) => {
        // Just log the results to the console.
        for (let p of promises) {
            p.then((result) => console.log(result));
        }
    });