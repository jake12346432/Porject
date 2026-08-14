import React, { useState, useEffect, useRef, useMemo } from "react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import * as XLSX from "xlsx";
import { submitBuy, getDailyOrdersSummary, downloadDailyOrdersFile, getAIPortfolioConfig } from "./api.js";

/* ============================== DATA ============================== */
const STOCKS = [{"ticker":"OBYSY","exch":"OTCM","name":"OBAYASHI CORPORATION","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":90.1,"V":17.3,"G":13.2,"M":29.2,"vol":15.7,"div":3.1,"dd":-39.8,"esg":93.5,"mcap":"Small (<$2B)"},{"ticker":"KIK","exch":"XFRA","name":"KIKKOMAN CORPORATION","country":"Germany","region":"Europe","devtype":"DM","sector":"Consumer Staples","Q":37.4,"V":66.4,"G":51.2,"M":25.7,"vol":54.5,"div":5.0,"dd":-63.6,"esg":83.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"AJINF","exch":"OTCM","name":"Ajinomoto Co., Inc.","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Consumer Staples","Q":88.4,"V":69.8,"G":65.6,"M":18.5,"vol":22.1,"div":0,"dd":-29.7,"esg":63.0,"mcap":"Large ($10B-$200B)"},{"ticker":"KXIAY","exch":"OTCM","name":"Kioxia Holdings Corporation","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":72.6,"V":33.0,"G":79.2,"M":35.6,"vol":51.4,"div":4.7,"dd":-34.1,"esg":94.7,"mcap":"Mega (>$200B)"},{"ticker":"JAPAF","exch":"OTCM","name":"JAPAN TOBACCO INC.","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Consumer Staples","Q":84.1,"V":83.9,"G":60.7,"M":49.5,"vol":21.4,"div":1.3,"dd":-51.7,"esg":43.3,"mcap":"Small (<$2B)"},{"ticker":"NEXOY","exch":"OTCM","name":"NEXON Co., Ltd.","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Internet, Media & Entertainment","Q":47.2,"V":67.9,"G":23.2,"M":80.9,"vol":33.7,"div":0,"dd":-40.4,"esg":82.8,"mcap":"Mid ($2B-$10B)"},{"ticker":"IBI","exch":"XFRA","name":"IBIDEN CO.,LTD.","country":"Germany","region":"Europe","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":56.6,"V":34.4,"G":83.6,"M":55.7,"vol":29.0,"div":5.3,"dd":-59.6,"esg":42.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"SEH0","exch":"XFRA","name":"Shin-Etsu Chemical Co., Ltd.","country":"Germany","region":"Europe","devtype":"DM","sector":"Materials & Chemicals","Q":59.5,"V":62.5,"G":41.5,"M":78.1,"vol":24.0,"div":4.8,"dd":-14.6,"esg":87.5,"mcap":"Large ($10B-$200B)"},{"ticker":"NURAF","exch":"OTCM","name":"Nomura Research Institute, Ltd.","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Software & IT Services","Q":94.6,"V":17.2,"G":37.5,"M":53.3,"vol":48.7,"div":4.6,"dd":-14.3,"esg":82.6,"mcap":"Mid ($2B-$10B)"},{"ticker":"4507N","exch":"XMEX","name":"Shionogi & Co., Ltd.","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":83.9,"V":60.4,"G":15.1,"M":94.8,"vol":28.6,"div":4.6,"dd":-42.2,"esg":88.6,"mcap":"Large ($10B-$200B)"},{"ticker":"4519N","exch":"XMEX","name":"CHUGAI PHARMACEUTICAL CO., LTD.","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":56.5,"V":31.0,"G":60.3,"M":46.1,"vol":52.0,"div":2.5,"dd":-43.3,"esg":91.9,"mcap":"Small (<$2B)"},{"ticker":"TUO0","exch":"XFRA","name":"TERUMO CORPORATION","country":"Germany","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":78.3,"V":44.5,"G":36.5,"M":50.8,"vol":48.1,"div":2.8,"dd":-23.6,"esg":32.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"D4S","exch":"XFRA","name":"DAIICHI SANKYO COMPANY, LIMITED","country":"Germany","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":89.6,"V":23.4,"G":38.6,"M":40.4,"vol":45.1,"div":3.6,"dd":-31.3,"esg":40.0,"mcap":"Mega (>$200B)"},{"ticker":"OSUKF","exch":"OTCM","name":"OTSUKA CORPORATION","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Consumer Staples","Q":46.1,"V":39.1,"G":58.3,"M":72.4,"vol":12.5,"div":0,"dd":-59.1,"esg":67.2,"mcap":"Mid ($2B-$10B)"},{"ticker":"YORUY","exch":"OTCM","name":"The Yokohama Rubber Company, Limited","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Automobiles & Components","Q":62.1,"V":29.6,"G":13.6,"M":71.8,"vol":24.6,"div":0.8,"dd":-42.5,"esg":46.9,"mcap":"Mega (>$200B)"},{"ticker":"BGT","exch":"XFRA","name":"BRIDGESTONE CORPORATION","country":"Germany","region":"Europe","devtype":"DM","sector":"Automobiles & Components","Q":55.5,"V":34.4,"G":63.8,"M":75.4,"vol":47.5,"div":0,"dd":-47.8,"esg":48.4,"mcap":"Large ($10B-$200B)"},{"ticker":"FKA","exch":"XFRA","name":"Furukawa Electric Co., Ltd.","country":"Germany","region":"Europe","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":65.5,"V":57.9,"G":13.8,"M":48.6,"vol":52.4,"div":3.2,"dd":-62.4,"esg":93.7,"mcap":"Mid ($2B-$10B)"},{"ticker":"SMO1","exch":"XFRA","name":"Sumitomo Electric Industries, Ltd.","country":"Germany","region":"Europe","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":33.5,"V":25.7,"G":63.5,"M":81.6,"vol":45.8,"div":0,"dd":-36.7,"esg":85.7,"mcap":"Mega (>$200B)"},{"ticker":"FJK0","exch":"XFRA","name":"Fujikura Ltd.","country":"Germany","region":"Europe","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":29.0,"V":22.4,"G":88.8,"M":53.8,"vol":16.4,"div":1.9,"dd":-22.6,"esg":72.1,"mcap":"Small (<$2B)"},{"ticker":"1RHA","exch":"XFRA","name":"Recruit Holdings Co.,Ltd.","country":"Germany","region":"Europe","devtype":"DM","sector":"Software & IT Services","Q":56.1,"V":94.9,"G":88.8,"M":70.4,"vol":15.1,"div":4.9,"dd":-62.6,"esg":32.1,"mcap":"Small (<$2B)"},{"ticker":"DISPF","exch":"OTCM","name":"DISCO CORPORATION","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":56.9,"V":17.4,"G":79.5,"M":61.7,"vol":29.1,"div":1.6,"dd":-62.2,"esg":44.1,"mcap":"Large ($10B-$200B)"},{"ticker":"SMGBF","exch":"OTCM","name":"SAN MIGUEL CORPORATION","country":"Philippines","region":"Asia-Pacific","devtype":"EM","sector":"Diversified / Other","Q":80.5,"V":34.9,"G":40.3,"M":81.0,"vol":53.7,"div":2.4,"dd":-13.5,"esg":63.1,"mcap":"Large ($10B-$200B)"},{"ticker":"KOM1","exch":"XFRA","name":"KOMATSU LTD.","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":60.6,"V":54.6,"G":94.1,"M":19.7,"vol":19.2,"div":2.1,"dd":-55.9,"esg":69.2,"mcap":"Mid ($2B-$10B)"},{"ticker":"EAR","exch":"XFRA","name":"EBARA CORPORATION","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":93.1,"V":74.8,"G":33.1,"M":94.1,"vol":19.1,"div":0.3,"dd":-20.2,"esg":26.2,"mcap":"Mid ($2B-$10B)"},{"ticker":"DKIA","exch":"XFRA","name":"DAIKIN INDUSTRIES,LTD.","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":52.0,"V":22.9,"G":32.8,"M":69.1,"vol":44.2,"div":4.5,"dd":-24.7,"esg":50.9,"mcap":"Large ($10B-$200B)"},{"ticker":"MIELY","exch":"OTCM","name":"Mitsubishi Electric Corporation","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":59.8,"V":91.2,"G":65.5,"M":64.2,"vol":45.8,"div":1.4,"dd":-29.0,"esg":34.9,"mcap":"Small (<$2B)"},{"ticker":"FJE","exch":"XFRA","name":"FUJI ELECTRIC CO., LTD.","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":87.0,"V":18.6,"G":69.0,"M":54.5,"vol":20.6,"div":1.4,"dd":-25.6,"esg":94.0,"mcap":"Large ($10B-$200B)"},{"ticker":"YEC0","exch":"XFRA","name":"YASKAWA Electric Corporation","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":36.7,"V":74.2,"G":92.1,"M":50.4,"vol":34.8,"div":4.9,"dd":-35.9,"esg":71.3,"mcap":"Large ($10B-$200B)"},{"ticker":"BYCRF","exch":"OTCM","name":"BayCurrent, Inc.","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Software & IT Services","Q":50.8,"V":66.3,"G":20.7,"M":22.3,"vol":39.4,"div":0.3,"dd":-22.9,"esg":40.7,"mcap":"Mega (>$200B)"},{"ticker":"NEC","exch":"XASX","name":"NINE ENTERTAINMENT CO. HOLDINGS LIMITED","country":"Australia","region":"Asia-Pacific","devtype":"DM","sector":"Internet, Media & Entertainment","Q":62.8,"V":23.4,"G":45.8,"M":96.3,"vol":16.0,"div":3.0,"dd":-9.7,"esg":78.5,"mcap":"Small (<$2B)"},{"ticker":"FUJ1","exch":"XFRA","name":"Fujitsu Limited","country":"Germany","region":"Europe","devtype":"DM","sector":"Industrials - Trading & Conglomerates","Q":34.8,"V":37.2,"G":34.5,"M":7.8,"vol":25.3,"div":0,"dd":-39.4,"esg":47.0,"mcap":"Mid ($2B-$10B)"},{"ticker":"RNECN","exch":"XMEX","name":"Renesas Electronics Corporation","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":79.3,"V":37.9,"G":87.0,"M":67.3,"vol":16.2,"div":3.1,"dd":-12.7,"esg":36.6,"mcap":"Mega (>$200B)"},{"ticker":"MAT","exch":"XFRA","name":"Panasonic Holdings Corporation","country":"Germany","region":"Europe","devtype":"DM","sector":"Industrials - Trading & Conglomerates","Q":69.6,"V":81.1,"G":52.9,"M":17.4,"vol":42.0,"div":2.6,"dd":-19.6,"esg":30.3,"mcap":"Small (<$2B)"},{"ticker":"SON1","exch":"XWBO","name":"Sony Group Corporation","country":"Austria","region":"Europe","devtype":"DM","sector":"Industrials - Trading & Conglomerates","Q":36.2,"V":89.4,"G":12.9,"M":21.8,"vol":19.4,"div":3.5,"dd":-39.4,"esg":45.5,"mcap":"Mega (>$200B)"},{"ticker":"TDK","exch":"XFRA","name":"TDK CORPORATION","country":"Germany","region":"Europe","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":46.8,"V":42.4,"G":23.1,"M":47.6,"vol":38.0,"div":2.4,"dd":-42.4,"esg":36.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"6857N","exch":"XMEX","name":"ADVANTEST CORPORATION","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":29.0,"V":39.4,"G":65.8,"M":21.0,"vol":42.5,"div":2.4,"dd":-64.7,"esg":75.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"KEE","exch":"XFRA","name":"KEYENCE CORPORATION","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":24.4,"V":78.1,"G":88.4,"M":95.9,"vol":44.2,"div":2.5,"dd":-34.8,"esg":78.7,"mcap":"Small (<$2B)"},{"ticker":"DNZOF","exch":"OTCM","name":"DENSO CORPORATION","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Automobiles & Components","Q":48.7,"V":54.3,"G":95.6,"M":40.1,"vol":19.8,"div":1.6,"dd":-57.4,"esg":74.0,"mcap":"Large ($10B-$200B)"},{"ticker":"LSRCF","exch":"OTCM","name":"Lasertec Corporation","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":50.9,"V":74.8,"G":64.7,"M":98.1,"vol":14.4,"div":0,"dd":-8.4,"esg":66.8,"mcap":"Mid ($2B-$10B)"},{"ticker":"FUCA","exch":"XFRA","name":"FANUC CORPORATION","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":44.1,"V":92.0,"G":92.9,"M":90.7,"vol":53.6,"div":3.9,"dd":-15.3,"esg":81.1,"mcap":"Mega (>$200B)"},{"ticker":"TYC1","exch":"XFRA","name":"TAIYO YUDEN CO., LTD.","country":"Germany","region":"Europe","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":96.9,"V":39.8,"G":41.4,"M":81.3,"vol":25.3,"div":3.8,"dd":-61.1,"esg":32.8,"mcap":"Large ($10B-$200B)"},{"ticker":"6981N","exch":"XMEX","name":"Murata Manufacturing Co., Ltd.","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":88.7,"V":79.6,"G":25.2,"M":51.3,"vol":46.1,"div":3.8,"dd":-64.0,"esg":75.3,"mcap":"Mega (>$200B)"},{"ticker":"NDEKF","exch":"OTCM","name":"NITTO DENKO CORPORATION","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":89.9,"V":61.1,"G":19.3,"M":41.4,"vol":18.6,"div":5.1,"dd":-23.8,"esg":83.1,"mcap":"Mega (>$200B)"},{"ticker":"MHVYF","exch":"OTCM","name":"Mitsubishi Heavy Industries, Ltd.","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":50.5,"V":81.1,"G":27.9,"M":25.7,"vol":13.8,"div":0.5,"dd":-24.7,"esg":25.4,"mcap":"Large ($10B-$200B)"},{"ticker":"IWJ","exch":"XFRA","name":"IHI Corporation","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":41.4,"V":25.5,"G":30.0,"M":92.7,"vol":32.4,"div":2.7,"dd":-30.8,"esg":51.6,"mcap":"Mid ($2B-$10B)"},{"ticker":"SUK0","exch":"XFRA","name":"SUZUKI MOTOR CORPORATION","country":"Germany","region":"Europe","devtype":"DM","sector":"Automobiles & Components","Q":69.4,"V":84.0,"G":83.6,"M":92.0,"vol":25.5,"div":0.8,"dd":-44.0,"esg":63.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"3RKU","exch":"XFRA","name":"RYOHIN KEIKAKU CO., LTD.","country":"Germany","region":"Europe","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":20.3,"V":66.5,"G":28.2,"M":70.4,"vol":21.9,"div":1.0,"dd":-17.5,"esg":33.5,"mcap":"Mega (>$200B)"},{"ticker":"PARR","exch":"XNYS","name":"PAR PACIFIC HOLDINGS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":70.5,"V":46.6,"G":36.1,"M":44.4,"vol":13.6,"div":0.7,"dd":-14.9,"esg":44.2,"mcap":"Mega (>$200B)"},{"ticker":"OLY1","exch":"XFRA","name":"OLYMPUS CORPORATION","country":"Germany","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":83.3,"V":59.5,"G":41.2,"M":93.6,"vol":12.2,"div":0,"dd":-39.8,"esg":33.8,"mcap":"Small (<$2B)"},{"ticker":"DAO","exch":"XFRA","name":"SCREEN Holdings Co.,Ltd.","country":"Germany","region":"Europe","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":71.4,"V":36.7,"G":60.7,"M":61.1,"vol":52.5,"div":0,"dd":-14.1,"esg":56.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"HYB","exch":"XFRA","name":"HOYA CORPORATION","country":"Germany","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":88.5,"V":55.1,"G":30.9,"M":48.1,"vol":31.7,"div":2.9,"dd":-37.2,"esg":65.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"N9B","exch":"XFRA","name":"Bandai Namco Holdings Inc.","country":"Germany","region":"Europe","devtype":"DM","sector":"Internet, Media & Entertainment","Q":84.9,"V":21.5,"G":20.4,"M":77.1,"vol":14.2,"div":3.3,"dd":-62.3,"esg":68.7,"mcap":"Large ($10B-$200B)"},{"ticker":"NTDOF","exch":"OTCM","name":"Nintendo Co., Ltd.","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Internet, Media & Entertainment","Q":98.0,"V":17.4,"G":64.3,"M":25.7,"vol":42.4,"div":0,"dd":-37.1,"esg":41.2,"mcap":"Mid ($2B-$10B)"},{"ticker":"9TO","exch":"XFRA","name":"TOYOTA TSUSHO CORPORATION","country":"Germany","region":"Europe","devtype":"DM","sector":"Automobiles & Components","Q":22.3,"V":94.2,"G":13.7,"M":53.7,"vol":32.7,"div":0,"dd":-9.3,"esg":44.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"MTS1","exch":"XFRA","name":"MITSUI & CO., LTD.","country":"Germany","region":"Europe","devtype":"DM","sector":"Industrials - Trading & Conglomerates","Q":55.9,"V":60.1,"G":66.5,"M":73.4,"vol":42.9,"div":5.5,"dd":-55.0,"esg":88.2,"mcap":"Mid ($2B-$10B)"},{"ticker":"TOELF","exch":"OTCM","name":"Tokyo Electron Limited","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":66.5,"V":55.6,"G":95.7,"M":59.5,"vol":29.8,"div":0,"dd":-11.1,"esg":80.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"MBI","exch":"XFRA","name":"Mitsubishi Corporation","country":"Germany","region":"Europe","devtype":"DM","sector":"Industrials - Trading & Conglomerates","Q":80.9,"V":74.8,"G":81.9,"M":43.2,"vol":26.0,"div":2.5,"dd":-20.6,"esg":73.5,"mcap":"Mega (>$200B)"},{"ticker":"OSKU","exch":"XFRA","name":"Japan Exchange Group, Inc.","country":"Germany","region":"Europe","devtype":"DM","sector":"Software & IT Services","Q":56.8,"V":50.8,"G":60.7,"M":6.0,"vol":36.3,"div":0.2,"dd":-12.7,"esg":47.0,"mcap":"Mega (>$200B)"},{"ticker":"L3W","exch":"XFRA","name":"NIPPON EXPRESS HOLDINGS, INC.","country":"Germany","region":"Europe","devtype":"DM","sector":"Telecom & Communication Services","Q":22.0,"V":50.0,"G":70.6,"M":46.5,"vol":23.4,"div":3.4,"dd":-61.3,"esg":29.1,"mcap":"Small (<$2B)"},{"ticker":"9433N","exch":"XMEX","name":"KDDI CORPORATION","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Telecom & Communication Services","Q":37.4,"V":26.4,"G":54.1,"M":18.7,"vol":45.8,"div":3.1,"dd":-33.6,"esg":56.4,"mcap":"Large ($10B-$200B)"},{"ticker":"9766N","exch":"XMEX","name":"KONAMI GROUP CORPORATION","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Internet, Media & Entertainment","Q":86.6,"V":18.1,"G":63.9,"M":77.3,"vol":25.8,"div":4.3,"dd":-41.9,"esg":70.5,"mcap":"Small (<$2B)"},{"ticker":"9983N","exch":"XMEX","name":"FAST RETAILING CO., LTD.","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":90.9,"V":73.0,"G":93.8,"M":62.9,"vol":13.0,"div":0.2,"dd":-64.0,"esg":35.5,"mcap":"Mid ($2B-$10B)"},{"ticker":"A","exch":"XNYS","name":"AGILENT TECHNOLOGIES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":81.6,"V":34.0,"G":87.5,"M":9.3,"vol":35.1,"div":4.6,"dd":-60.0,"esg":77.7,"mcap":"Small (<$2B)"},{"ticker":"AAFN","exch":"XMEX","name":"AIRTEL AFRICA PLC","country":"Nigeria/Africa","region":"Africa","devtype":"EM","sector":"Diversified / Other","Q":60.5,"V":82.5,"G":75.1,"M":19.4,"vol":19.7,"div":0,"dd":-50.0,"esg":70.6,"mcap":"Mid ($2B-$10B)"},{"ticker":"AAPL","exch":"XNAS","name":"APPLE INC.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":30.7,"V":47.5,"G":94.4,"M":59.0,"vol":31.4,"div":1.4,"dd":-48.3,"esg":45.7,"mcap":"Large ($10B-$200B)"},{"ticker":"ABBN","exch":"XSWX","name":"Abb Ltd","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":78.4,"V":62.6,"G":69.0,"M":95.8,"vol":26.6,"div":0,"dd":-42.7,"esg":68.4,"mcap":"Large ($10B-$200B)"},{"ticker":"ABBV","exch":"XNYS","name":"ABBVIE INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":53.1,"V":34.5,"G":88.4,"M":92.6,"vol":37.4,"div":4.7,"dd":-60.7,"esg":66.6,"mcap":"Mega (>$200B)"},{"ticker":"ABI","exch":"XBRU","name":"Anheuser-Busch Inbev SA","country":"Belgium","region":"Europe","devtype":"DM","sector":"Consumer Staples","Q":20.8,"V":21.8,"G":87.3,"M":91.2,"vol":52.0,"div":2.7,"dd":-44.7,"esg":82.5,"mcap":"Mid ($2B-$10B)"},{"ticker":"ACN","exch":"XNYS","name":"ACCENTURE PUBLIC LIMITED COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":77.5,"V":27.4,"G":43.8,"M":90.3,"vol":52.9,"div":5.2,"dd":-10.3,"esg":77.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"ACS","exch":"BMEX","name":"ACS Actividades de Construccion y Servicios SA","country":"Spain","region":"Europe","devtype":"DM","sector":"Financials","Q":88.5,"V":15.2,"G":25.2,"M":17.8,"vol":15.5,"div":0,"dd":-57.2,"esg":77.3,"mcap":"Large ($10B-$200B)"},{"ticker":"ADI","exch":"XNAS","name":"ANALOG DEVICES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":73.6,"V":93.3,"G":94.2,"M":76.4,"vol":45.1,"div":0.1,"dd":-24.7,"esg":48.7,"mcap":"Mid ($2B-$10B)"},{"ticker":"ADBE","exch":"XNAS","name":"ADOBE INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":62.0,"V":81.6,"G":12.7,"M":60.5,"vol":27.3,"div":2.6,"dd":-58.8,"esg":54.5,"mcap":"Mega (>$200B)"},{"ticker":"ADDT B","exch":"XSTO","name":"Addtech AB","country":"Sweden","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":33.1,"V":78.4,"G":39.6,"M":56.7,"vol":46.2,"div":4.9,"dd":-43.6,"esg":52.3,"mcap":"Small (<$2B)"},{"ticker":"ADP","exch":"XNAS","name":"AUTOMATIC DATA PROCESSING, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":44.1,"V":59.7,"G":37.0,"M":9.6,"vol":25.1,"div":2.7,"dd":-59.8,"esg":31.8,"mcap":"Mid ($2B-$10B)"},{"ticker":"ADS","exch":"XFRA","name":"Adidas AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Automobiles & Components","Q":46.2,"V":84.9,"G":36.0,"M":96.0,"vol":13.7,"div":2.2,"dd":-48.5,"esg":70.2,"mcap":"Mid ($2B-$10B)"},{"ticker":"ADSK","exch":"XNAS","name":"AUTODESK, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":97.7,"V":29.8,"G":30.8,"M":55.6,"vol":46.5,"div":3.0,"dd":-47.6,"esg":32.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"ADYEN","exch":"XAMS","name":"Adyen NV","country":"Netherlands","region":"Europe","devtype":"DM","sector":"Software & IT Services","Q":44.7,"V":94.4,"G":71.1,"M":29.7,"vol":43.8,"div":1.3,"dd":-33.5,"esg":55.2,"mcap":"Mega (>$200B)"},{"ticker":"AIR","exch":"XETR","name":"Airbus SE","country":"Germany","region":"Europe","devtype":"DM","sector":"Aerospace & Defense","Q":71.1,"V":88.3,"G":40.8,"M":44.0,"vol":28.8,"div":0,"dd":-36.2,"esg":93.2,"mcap":"Mega (>$200B)"},{"ticker":"AJG","exch":"XNYS","name":"ARTHUR J. GALLAGHER & CO.","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":20.1,"V":82.9,"G":82.7,"M":94.3,"vol":26.5,"div":2.9,"dd":-9.4,"esg":51.5,"mcap":"Large ($10B-$200B)"},{"ticker":"ALE","exch":"XFRA","name":"ALPS ALPINE CO., LTD.","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":55.6,"V":71.4,"G":48.0,"M":34.7,"vol":45.3,"div":4.3,"dd":-39.9,"esg":86.3,"mcap":"Large ($10B-$200B)"},{"ticker":"ALFA","exch":"XSTO","name":"Alfa Laval AB","country":"Sweden","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":70.4,"V":30.6,"G":19.5,"M":76.6,"vol":25.5,"div":2.3,"dd":-25.7,"esg":36.6,"mcap":"Mega (>$200B)"},{"ticker":"ALGN","exch":"XNAS","name":"ALIGN TECHNOLOGY, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":75.1,"V":31.3,"G":65.4,"M":10.9,"vol":33.9,"div":2.8,"dd":-17.2,"esg":74.6,"mcap":"Mid ($2B-$10B)"},{"ticker":"ALLE","exch":"XNYS","name":"ALLEGION PUBLIC LIMITED COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":79.8,"V":28.9,"G":16.0,"M":32.0,"vol":50.1,"div":0.3,"dd":-11.1,"esg":25.4,"mcap":"Mega (>$200B)"},{"ticker":"PA","exch":"XTSX","name":"PALAMINA CORP.","country":"Peru","region":"Latin America","devtype":"EM","sector":"Aerospace & Defense","Q":52.7,"V":36.7,"G":66.9,"M":43.0,"vol":19.3,"div":3.1,"dd":-39.9,"esg":37.6,"mcap":"Large ($10B-$200B)"},{"ticker":"AMAT","exch":"XNAS","name":"APPLIED MATERIALS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":65.6,"V":22.4,"G":59.0,"M":28.6,"vol":38.5,"div":2.4,"dd":-36.1,"esg":79.0,"mcap":"Mega (>$200B)"},{"ticker":"AMD","exch":"XNAS","name":"ADVANCED MICRO DEVICES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":89.5,"V":80.6,"G":42.1,"M":43.5,"vol":43.7,"div":2.5,"dd":-47.8,"esg":83.5,"mcap":"Large ($10B-$200B)"},{"ticker":"AME","exch":"XNYS","name":"AMETEK, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":70.8,"V":91.6,"G":12.6,"M":53.5,"vol":25.9,"div":0,"dd":-21.1,"esg":67.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"AMGN","exch":"XNAS","name":"AMGEN INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":95.7,"V":61.4,"G":10.8,"M":96.9,"vol":43.6,"div":0,"dd":-51.9,"esg":82.4,"mcap":"Large ($10B-$200B)"},{"ticker":"AMS","exch":"XSWX","name":"ams-OSRAM AG","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":77.6,"V":78.2,"G":50.6,"M":80.0,"vol":34.5,"div":0.2,"dd":-29.8,"esg":47.2,"mcap":"Small (<$2B)"},{"ticker":"AMZN","exch":"XNAS","name":"AMAZON.COM, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Internet, Media & Entertainment","Q":52.4,"V":47.9,"G":79.9,"M":74.1,"vol":36.6,"div":2.1,"dd":-23.0,"esg":89.2,"mcap":"Small (<$2B)"},{"ticker":"ANDR","exch":"XWBO","name":"Andritz AG","country":"Austria","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":70.2,"V":65.9,"G":48.3,"M":38.2,"vol":41.2,"div":0,"dd":-64.8,"esg":72.0,"mcap":"Large ($10B-$200B)"},{"ticker":"ANET","exch":"XNYS","name":"ARISTA NETWORKS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":36.2,"V":44.4,"G":44.8,"M":40.5,"vol":26.0,"div":0.8,"dd":-18.3,"esg":27.9,"mcap":"Large ($10B-$200B)"},{"ticker":"AON","exch":"XNYS","name":"AON PUBLIC LIMITED COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":66.9,"V":77.0,"G":11.5,"M":40.2,"vol":16.3,"div":1.3,"dd":-58.0,"esg":30.8,"mcap":"Mid ($2B-$10B)"},{"ticker":"AOS","exch":"XNYS","name":"A. O. SMITH CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":97.0,"V":40.7,"G":38.9,"M":83.8,"vol":22.8,"div":0,"dd":-32.6,"esg":77.8,"mcap":"Small (<$2B)"},{"ticker":"APA","exch":"XNAS","name":"APA CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":40.0,"V":69.1,"G":51.5,"M":43.6,"vol":47.5,"div":1.6,"dd":-13.3,"esg":56.9,"mcap":"Small (<$2B)"},{"ticker":"APH","exch":"XNYS","name":"AMPHENOL CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":58.7,"V":23.3,"G":83.6,"M":88.1,"vol":30.5,"div":3.3,"dd":-39.6,"esg":50.9,"mcap":"Large ($10B-$200B)"},{"ticker":"APP","exch":"XNAS","name":"APPLOVIN CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":22.8,"V":85.0,"G":83.3,"M":83.3,"vol":30.3,"div":0.3,"dd":-58.2,"esg":71.5,"mcap":"Mega (>$200B)"},{"ticker":"ARGX","exch":"XNAS","name":"argenx SE","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":25.7,"V":46.3,"G":80.9,"M":60.3,"vol":53.1,"div":5.3,"dd":-58.2,"esg":62.7,"mcap":"Mid ($2B-$10B)"},{"ticker":"ASM","exch":"XAMS","name":"ASM International NV","country":"Netherlands","region":"Europe","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":82.5,"V":34.3,"G":63.9,"M":10.9,"vol":45.8,"div":1.8,"dd":-35.3,"esg":64.4,"mcap":"Small (<$2B)"},{"ticker":"ASML","exch":"XAMS","name":"ASML Holding NV","country":"Netherlands","region":"Europe","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":39.4,"V":74.7,"G":73.3,"M":56.5,"vol":28.9,"div":2.2,"dd":-29.3,"esg":80.4,"mcap":"Small (<$2B)"},{"ticker":"ASSA B","exch":"XSTO","name":"Assa Abloy AB","country":"Sweden","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":40.0,"V":29.6,"G":95.9,"M":70.5,"vol":51.6,"div":3.0,"dd":-54.8,"esg":36.9,"mcap":"Small (<$2B)"},{"ticker":"ATCO A","exch":"XSTO","name":"Atlas Copco AB","country":"Sweden","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":47.6,"V":44.6,"G":41.0,"M":65.7,"vol":26.3,"div":3.4,"dd":-38.5,"esg":63.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"AVGO","exch":"XNAS","name":"BROADCOM INC.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":51.5,"V":83.2,"G":27.2,"M":58.2,"vol":21.4,"div":0.5,"dd":-64.7,"esg":32.2,"mcap":"Large ($10B-$200B)"},{"ticker":"AZN","exch":"XNYS","name":"ASTRAZENECA PLC","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":29.1,"V":71.9,"G":62.2,"M":88.8,"vol":24.3,"div":0,"dd":-59.6,"esg":84.8,"mcap":"Large ($10B-$200B)"},{"ticker":"AZO","exch":"XNYS","name":"AUTOZONE, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":60.1,"V":71.9,"G":68.0,"M":67.3,"vol":36.1,"div":1.0,"dd":-35.6,"esg":46.5,"mcap":"Small (<$2B)"},{"ticker":"BA.","exch":"XLON","name":"BAE SYSTEMS PLC","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Aerospace & Defense","Q":80.7,"V":75.2,"G":92.8,"M":91.4,"vol":30.5,"div":2.7,"dd":-38.0,"esg":50.8,"mcap":"Mega (>$200B)"},{"ticker":"BALL","exch":"XNYS","name":"BALL CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Industrials - Trading & Conglomerates","Q":68.8,"V":96.8,"G":39.3,"M":81.6,"vol":20.1,"div":1.8,"dd":-20.1,"esg":86.4,"mcap":"Large ($10B-$200B)"},{"ticker":"BBY","exch":"XNYS","name":"BEST BUY CO., INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":29.8,"V":78.0,"G":35.3,"M":42.6,"vol":26.8,"div":0,"dd":-30.4,"esg":27.7,"mcap":"Large ($10B-$200B)"},{"ticker":"BC","exch":"XMIL","name":"Brunello Cucinelli SpA","country":"Italy","region":"Europe","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":33.1,"V":15.5,"G":67.0,"M":51.0,"vol":33.8,"div":0,"dd":-64.1,"esg":59.6,"mcap":"Small (<$2B)"},{"ticker":"BEAN","exch":"XSWX","name":"BELIMO Holding Ltd","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":36.2,"V":33.3,"G":31.1,"M":6.5,"vol":19.0,"div":1.0,"dd":-10.1,"esg":39.2,"mcap":"Small (<$2B)"},{"ticker":"BEI","exch":"XFRA","name":"Beiersdorf AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Consumer Staples","Q":66.7,"V":59.4,"G":60.6,"M":95.4,"vol":44.0,"div":0,"dd":-42.5,"esg":94.0,"mcap":"Small (<$2B)"},{"ticker":"BESI","exch":"XAMS","name":"BE Semiconductor Industries NV","country":"Netherlands","region":"Europe","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":56.6,"V":62.4,"G":54.9,"M":37.0,"vol":15.1,"div":0.4,"dd":-50.1,"esg":53.5,"mcap":"Mid ($2B-$10B)"},{"ticker":"BGN","exch":"XMIL","name":"Banca Generali SpA","country":"Italy","region":"Europe","devtype":"DM","sector":"Financials","Q":48.7,"V":54.9,"G":36.4,"M":87.9,"vol":30.3,"div":3.7,"dd":-43.1,"esg":52.6,"mcap":"Large ($10B-$200B)"},{"ticker":"BKNG","exch":"XNAS","name":"BOOKING HOLDINGS INC.","country":"United States","region":"North America","devtype":"DM","sector":"Internet, Media & Entertainment","Q":75.3,"V":84.1,"G":16.8,"M":6.0,"vol":34.0,"div":2.1,"dd":-40.0,"esg":33.2,"mcap":"Mid ($2B-$10B)"},{"ticker":"BKR","exch":"XNAS","name":"BAKER HUGHES COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":41.2,"V":61.1,"G":85.9,"M":62.8,"vol":36.2,"div":0,"dd":-54.8,"esg":65.4,"mcap":"Mega (>$200B)"},{"ticker":"BLK","exch":"XNYS","name":"BLACKROCK, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":64.0,"V":95.3,"G":12.4,"M":70.4,"vol":27.4,"div":1.7,"dd":-28.6,"esg":69.1,"mcap":"Mega (>$200B)"},{"ticker":"BMED","exch":"XMIL","name":"Banca Mediolanum SpA","country":"Italy","region":"Europe","devtype":"DM","sector":"Financials","Q":68.1,"V":26.3,"G":21.6,"M":37.3,"vol":45.7,"div":2.7,"dd":-29.3,"esg":53.7,"mcap":"Large ($10B-$200B)"},{"ticker":"BUZ","exch":"XFRA","name":"BUNZL PUBLIC LIMITED COMPANY","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":29.7,"V":86.1,"G":50.0,"M":64.0,"vol":20.0,"div":4.3,"dd":-31.7,"esg":53.7,"mcap":"Large ($10B-$200B)"},{"ticker":"BOL","exch":"XPAR","name":"Bollore SE","country":"France","region":"Europe","devtype":"DM","sector":"Consumer Staples","Q":87.2,"V":72.2,"G":17.9,"M":94.7,"vol":52.5,"div":3.7,"dd":-49.8,"esg":45.7,"mcap":"Mid ($2B-$10B)"},{"ticker":"BR","exch":"XNYS","name":"BROADRIDGE FINANCIAL SOLUTIONS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":88.6,"V":60.9,"G":42.9,"M":19.4,"vol":48.8,"div":0,"dd":-58.5,"esg":51.9,"mcap":"Small (<$2B)"},{"ticker":"BSX","exch":"XNYS","name":"BOSTON SCIENTIFIC CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":44.2,"V":34.3,"G":88.9,"M":15.4,"vol":30.9,"div":4.1,"dd":-36.2,"esg":55.0,"mcap":"Mid ($2B-$10B)"},{"ticker":"BT.A","exch":"XLON","name":"BT GROUP PLC","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Telecom & Communication Services","Q":38.9,"V":95.9,"G":12.0,"M":59.4,"vol":49.9,"div":3.3,"dd":-22.8,"esg":72.8,"mcap":"Mega (>$200B)"},{"ticker":"BVI","exch":"XPAR","name":"Bureau Veritas SA","country":"France","region":"Europe","devtype":"DM","sector":"Financials","Q":90.9,"V":62.7,"G":21.7,"M":55.8,"vol":44.3,"div":0.1,"dd":-24.8,"esg":33.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"CA","exch":"XPAR","name":"Carrefour SA","country":"France","region":"Europe","devtype":"DM","sector":"Consumer Staples","Q":67.5,"V":21.1,"G":38.0,"M":56.1,"vol":18.5,"div":0.7,"dd":-54.7,"esg":60.7,"mcap":"Mid ($2B-$10B)"},{"ticker":"CAP","exch":"XPAR","name":"Capgemini SE","country":"France","region":"Europe","devtype":"DM","sector":"Software & IT Services","Q":75.8,"V":76.8,"G":50.3,"M":92.5,"vol":34.7,"div":0,"dd":-33.6,"esg":66.2,"mcap":"Small (<$2B)"},{"ticker":"CASY","exch":"XNAS","name":"CASEY'S GENERAL STORES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":47.1,"V":46.6,"G":57.9,"M":54.8,"vol":31.4,"div":1.3,"dd":-42.1,"esg":59.5,"mcap":"Mid ($2B-$10B)"},{"ticker":"CBOE","exch":"BATS","name":"CBOE GLOBAL MARKETS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":25.9,"V":25.6,"G":18.7,"M":9.1,"vol":38.4,"div":0,"dd":-9.4,"esg":46.7,"mcap":"Mid ($2B-$10B)"},{"ticker":"CBRE","exch":"XNYS","name":"CBRE GROUP, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":70.2,"V":27.3,"G":38.3,"M":30.4,"vol":31.5,"div":0,"dd":-40.5,"esg":66.9,"mcap":"Mega (>$200B)"},{"ticker":"CDNS","exch":"XNAS","name":"CADENCE DESIGN SYSTEMS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":57.2,"V":59.1,"G":66.1,"M":83.0,"vol":42.3,"div":2.4,"dd":-31.4,"esg":59.6,"mcap":"Small (<$2B)"},{"ticker":"CDR","exch":"XWAR","name":"CD Projekt SA","country":"Poland","region":"Europe","devtype":"EM","sector":"Internet, Media & Entertainment","Q":68.2,"V":83.8,"G":75.2,"M":83.0,"vol":24.0,"div":0,"dd":-38.7,"esg":35.7,"mcap":"Mid ($2B-$10B)"},{"ticker":"CF","exch":"XNYS","name":"CF INDUSTRIES HOLDINGS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Materials & Chemicals","Q":27.7,"V":15.6,"G":43.8,"M":21.9,"vol":44.1,"div":0,"dd":-32.7,"esg":60.2,"mcap":"Small (<$2B)"},{"ticker":"CFR","exch":"XNYS","name":"CULLEN/FROST BANKERS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":49.1,"V":19.1,"G":27.2,"M":89.0,"vol":13.3,"div":2.6,"dd":-48.2,"esg":75.6,"mcap":"Small (<$2B)"},{"ticker":"CHD","exch":"XNYS","name":"CHURCH & DWIGHT CO., INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Staples","Q":59.1,"V":75.9,"G":40.7,"M":72.4,"vol":17.1,"div":0.7,"dd":-38.5,"esg":50.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"CHRW","exch":"XNAS","name":"C.H. ROBINSON WORLDWIDE, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":72.0,"V":85.3,"G":62.9,"M":22.9,"vol":54.2,"div":4.6,"dd":-10.8,"esg":45.6,"mcap":"Mega (>$200B)"},{"ticker":"CI","exch":"XNYS","name":"THE CIGNA GROUP","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":60.1,"V":58.9,"G":54.7,"M":11.2,"vol":35.3,"div":3.5,"dd":-57.8,"esg":29.5,"mcap":"Mega (>$200B)"},{"ticker":"CIEN","exch":"XNYS","name":"CIENA CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":59.2,"V":74.0,"G":78.0,"M":70.7,"vol":52.3,"div":5.1,"dd":-28.6,"esg":61.9,"mcap":"Large ($10B-$200B)"},{"ticker":"CL","exch":"XNYS","name":"COLGATE-PALMOLIVE COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Staples","Q":32.9,"V":92.9,"G":53.4,"M":15.7,"vol":44.4,"div":2.4,"dd":-62.3,"esg":94.0,"mcap":"Mega (>$200B)"},{"ticker":"CME","exch":"XNAS","name":"CME GROUP INC.","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":80.5,"V":82.3,"G":92.8,"M":21.2,"vol":51.1,"div":2.0,"dd":-39.9,"esg":72.0,"mcap":"Mega (>$200B)"},{"ticker":"CMG","exch":"XNYS","name":"CHIPOTLE MEXICAN GRILL, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":89.5,"V":66.8,"G":44.1,"M":89.3,"vol":43.1,"div":0,"dd":-14.7,"esg":40.2,"mcap":"Small (<$2B)"},{"ticker":"CMI","exch":"XNYS","name":"CUMMINS INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":86.3,"V":67.6,"G":41.0,"M":35.7,"vol":25.6,"div":0,"dd":-26.0,"esg":87.7,"mcap":"Mega (>$200B)"},{"ticker":"COF","exch":"XNYS","name":"CAPITAL ONE FINANCIAL CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":52.8,"V":68.2,"G":42.7,"M":80.6,"vol":25.3,"div":0,"dd":-54.8,"esg":55.9,"mcap":"Large ($10B-$200B)"},{"ticker":"COHR","exch":"XNYS","name":"Coherent Corp.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":32.1,"V":58.7,"G":80.4,"M":35.1,"vol":25.3,"div":1.7,"dd":-29.0,"esg":28.5,"mcap":"Large ($10B-$200B)"},{"ticker":"COP","exch":"XNYS","name":"CONOCOPHILLIPS","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":27.9,"V":72.4,"G":20.5,"M":27.6,"vol":48.1,"div":1.6,"dd":-47.5,"esg":71.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"COR","exch":"XNYS","name":"CENCORA, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":89.9,"V":85.6,"G":19.9,"M":60.7,"vol":13.4,"div":1.5,"dd":-60.3,"esg":52.4,"mcap":"Large ($10B-$200B)"},{"ticker":"COST","exch":"XNAS","name":"COSTCO WHOLESALE CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Staples","Q":33.4,"V":96.0,"G":38.1,"M":49.3,"vol":46.6,"div":3.0,"dd":-40.4,"esg":72.6,"mcap":"Mid ($2B-$10B)"},{"ticker":"CPAY","exch":"XNYS","name":"CORPAY, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":70.1,"V":91.8,"G":83.9,"M":53.8,"vol":24.0,"div":4.0,"dd":-54.5,"esg":44.4,"mcap":"Mega (>$200B)"},{"ticker":"CPG","exch":"XLON","name":"COMPASS GROUP PLC","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Diversified / Other","Q":89.1,"V":58.3,"G":23.1,"M":9.8,"vol":23.2,"div":4.4,"dd":-18.9,"esg":40.0,"mcap":"Mid ($2B-$10B)"},{"ticker":"CPRT","exch":"XNAS","name":"COPART, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":68.9,"V":54.7,"G":47.2,"M":45.8,"vol":42.5,"div":5.4,"dd":-17.7,"esg":85.2,"mcap":"Mid ($2B-$10B)"},{"ticker":"CRH","exch":"XNYS","name":"CRH PUBLIC LIMITED COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":74.5,"V":18.3,"G":62.5,"M":6.4,"vol":35.6,"div":0,"dd":-13.9,"esg":30.6,"mcap":"Large ($10B-$200B)"},{"ticker":"CSCO","exch":"XNAS","name":"CISCO SYSTEMS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":26.3,"V":33.6,"G":71.1,"M":78.0,"vol":34.6,"div":3.1,"dd":-61.4,"esg":50.1,"mcap":"Small (<$2B)"},{"ticker":"CSGP","exch":"XNAS","name":"COSTAR GROUP, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":92.3,"V":94.9,"G":48.6,"M":38.6,"vol":15.7,"div":0.4,"dd":-42.6,"esg":74.2,"mcap":"Mid ($2B-$10B)"},{"ticker":"CSX","exch":"XNAS","name":"CSX Corporation","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":50.2,"V":49.8,"G":16.3,"M":61.2,"vol":18.2,"div":2.5,"dd":-48.8,"esg":37.3,"mcap":"Mega (>$200B)"},{"ticker":"CTAS","exch":"XNAS","name":"CINTAS CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":55.4,"V":34.0,"G":94.4,"M":89.6,"vol":19.0,"div":0,"dd":-51.7,"esg":91.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"CTSH","exch":"XNAS","name":"COGNIZANT TECHNOLOGY SOLUTIONS CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":27.0,"V":19.7,"G":77.1,"M":61.8,"vol":44.2,"div":0,"dd":-47.0,"esg":38.3,"mcap":"Large ($10B-$200B)"},{"ticker":"CTVA","exch":"XNYS","name":"CORTEVA, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Materials & Chemicals","Q":65.6,"V":38.7,"G":50.9,"M":86.5,"vol":47.2,"div":4.0,"dd":-39.5,"esg":50.3,"mcap":"Small (<$2B)"},{"ticker":"CVC","exch":"XWBO","name":"CVC CAPITAL PARTNERS PLC","country":"Austria","region":"Europe","devtype":"DM","sector":"Financials","Q":74.2,"V":56.2,"G":36.7,"M":44.8,"vol":29.6,"div":0,"dd":-62.3,"esg":52.3,"mcap":"Small (<$2B)"},{"ticker":"CVS","exch":"XNYS","name":"CVS HEALTH CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":26.6,"V":67.5,"G":22.7,"M":88.0,"vol":38.8,"div":4.4,"dd":-46.5,"esg":56.3,"mcap":"Mid ($2B-$10B)"},{"ticker":"CVX","exch":"XNYS","name":"CHEVRON CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":40.1,"V":69.7,"G":80.6,"M":86.0,"vol":34.3,"div":2.4,"dd":-54.3,"esg":56.5,"mcap":"Mid ($2B-$10B)"},{"ticker":"DAL","exch":"XNYS","name":"DELTA AIR LINES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":64.1,"V":25.7,"G":92.8,"M":34.6,"vol":49.3,"div":3.6,"dd":-31.0,"esg":47.0,"mcap":"Mid ($2B-$10B)"},{"ticker":"DB1","exch":"XFRA","name":"Deutsche Boerse AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Software & IT Services","Q":75.9,"V":42.5,"G":62.0,"M":70.6,"vol":27.3,"div":0,"dd":-46.8,"esg":43.2,"mcap":"Small (<$2B)"},{"ticker":"DE","exch":"XNYS","name":"DEERE & COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":62.0,"V":57.4,"G":34.5,"M":19.2,"vol":48.0,"div":3.5,"dd":-51.7,"esg":71.8,"mcap":"Mid ($2B-$10B)"},{"ticker":"DECK","exch":"XNYS","name":"DECKERS OUTDOOR CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":91.1,"V":86.7,"G":17.5,"M":60.5,"vol":22.5,"div":4.6,"dd":-53.1,"esg":81.3,"mcap":"Small (<$2B)"},{"ticker":"DELL","exch":"XNYS","name":"DELL TECHNOLOGIES INC.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":50.4,"V":47.1,"G":37.6,"M":54.9,"vol":16.9,"div":5.5,"dd":-52.2,"esg":47.3,"mcap":"Mega (>$200B)"},{"ticker":"WDH1","exch":"XETR","name":"Demant A/S","country":"Germany","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":39.1,"V":63.2,"G":29.5,"M":52.0,"vol":48.9,"div":0.3,"dd":-57.2,"esg":55.8,"mcap":"Mid ($2B-$10B)"},{"ticker":"DG","exch":"XPAR","name":"Vinci SA","country":"France","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":27.6,"V":86.8,"G":70.5,"M":8.0,"vol":26.8,"div":4.8,"dd":-34.0,"esg":35.0,"mcap":"Small (<$2B)"},{"ticker":"DGX","exch":"XNYS","name":"QUEST DIAGNOSTICS INCORPORATED","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":41.9,"V":45.8,"G":11.0,"M":60.3,"vol":13.0,"div":2.2,"dd":-59.2,"esg":80.5,"mcap":"Small (<$2B)"},{"ticker":"DHL","exch":"XETR","name":"Deutsche Post AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Telecom & Communication Services","Q":87.2,"V":77.0,"G":30.8,"M":56.6,"vol":38.0,"div":1.4,"dd":-63.5,"esg":83.3,"mcap":"Mega (>$200B)"},{"ticker":"DHR","exch":"XNYS","name":"DANAHER CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":86.8,"V":84.1,"G":88.5,"M":74.3,"vol":40.1,"div":0,"dd":-42.1,"esg":84.0,"mcap":"Mid ($2B-$10B)"},{"ticker":"DLG","exch":"XMIL","name":"De' Longhi SpA","country":"Italy","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":20.1,"V":61.4,"G":86.2,"M":16.2,"vol":21.7,"div":0,"dd":-57.7,"esg":59.6,"mcap":"Small (<$2B)"},{"ticker":"DNP","exch":"XWAR","name":"Dino Polska SA","country":"Poland","region":"Europe","devtype":"EM","sector":"Consumer Staples","Q":71.7,"V":52.8,"G":50.2,"M":41.1,"vol":19.5,"div":4.8,"dd":-52.4,"esg":38.7,"mcap":"Mid ($2B-$10B)"},{"ticker":"DOV","exch":"XNYS","name":"DOVER CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":96.4,"V":73.2,"G":70.1,"M":30.9,"vol":21.0,"div":3.9,"dd":-26.6,"esg":34.9,"mcap":"Mega (>$200B)"},{"ticker":"DPLM","exch":"XLON","name":"DIPLOMA PLC","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":21.1,"V":27.5,"G":77.2,"M":76.3,"vol":46.8,"div":0,"dd":-9.8,"esg":48.7,"mcap":"Mid ($2B-$10B)"},{"ticker":"DSY","exch":"XFRA","name":"Dassault Systemes SE","country":"Germany","region":"Europe","devtype":"DM","sector":"Materials & Chemicals","Q":46.6,"V":86.8,"G":59.5,"M":66.9,"vol":15.9,"div":5.0,"dd":-61.3,"esg":31.8,"mcap":"Large ($10B-$200B)"},{"ticker":"DTG","exch":"XFRA","name":"Daimler Truck Holding AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Automobiles & Components","Q":20.9,"V":28.2,"G":80.0,"M":39.1,"vol":44.9,"div":1.6,"dd":-39.2,"esg":68.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"DVA","exch":"XNYS","name":"DAVITA INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":93.3,"V":59.9,"G":29.0,"M":30.8,"vol":30.5,"div":1.9,"dd":-27.5,"esg":40.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"DVN","exch":"XNYS","name":"DEVON ENERGY CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":42.0,"V":29.6,"G":32.1,"M":9.5,"vol":50.4,"div":1.3,"dd":-25.0,"esg":56.7,"mcap":"Mega (>$200B)"},{"ticker":"DXCM","exch":"XNAS","name":"DEXCOM, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":69.3,"V":41.1,"G":61.2,"M":63.7,"vol":15.8,"div":4.5,"dd":-27.7,"esg":71.7,"mcap":"Mega (>$200B)"},{"ticker":"EBAY","exch":"XNAS","name":"EBAY INC.","country":"United States","region":"North America","devtype":"DM","sector":"Internet, Media & Entertainment","Q":38.0,"V":29.4,"G":88.8,"M":53.4,"vol":30.5,"div":0.1,"dd":-14.7,"esg":71.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"ECL","exch":"XNYS","name":"ECOLAB INC.","country":"United States","region":"North America","devtype":"DM","sector":"Materials & Chemicals","Q":24.8,"V":77.1,"G":23.8,"M":37.3,"vol":16.0,"div":0.2,"dd":-54.8,"esg":28.7,"mcap":"Large ($10B-$200B)"},{"ticker":"EDEN","exch":"XPAR","name":"Edenred SE","country":"France","region":"Europe","devtype":"DM","sector":"Consumer Staples","Q":49.1,"V":89.3,"G":19.6,"M":79.5,"vol":28.3,"div":2.6,"dd":-17.6,"esg":46.0,"mcap":"Mid ($2B-$10B)"},{"ticker":"EDV","exch":"XASX","name":"ENDEAVOUR GROUP LIMITED","country":"Australia","region":"Asia-Pacific","devtype":"DM","sector":"Consumer Staples","Q":40.1,"V":78.1,"G":26.2,"M":15.8,"vol":41.0,"div":0,"dd":-19.0,"esg":35.5,"mcap":"Small (<$2B)"},{"ticker":"ELISA","exch":"XHEL","name":"Elisa Oyj","country":"Finland","region":"Europe","devtype":"DM","sector":"Telecom & Communication Services","Q":80.5,"V":95.5,"G":15.4,"M":57.5,"vol":16.8,"div":4.8,"dd":-64.3,"esg":59.0,"mcap":"Mega (>$200B)"},{"ticker":"ELV","exch":"XNYS","name":"ELEVANCE HEALTH, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":71.1,"V":67.5,"G":27.6,"M":59.5,"vol":43.1,"div":1.5,"dd":-16.7,"esg":79.0,"mcap":"Mid ($2B-$10B)"},{"ticker":"EME","exch":"XNYS","name":"EMCOR GROUP, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":70.6,"V":76.1,"G":78.6,"M":5.6,"vol":48.0,"div":4.2,"dd":-30.8,"esg":40.2,"mcap":"Small (<$2B)"},{"ticker":"EMSN","exch":"XSWX","name":"Ems Chemie Holding AG","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":93.9,"V":42.9,"G":44.8,"M":49.3,"vol":18.9,"div":0,"dd":-58.9,"esg":73.7,"mcap":"Large ($10B-$200B)"},{"ticker":"EN","exch":"XPAR","name":"Bouygues SA","country":"France","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":49.4,"V":79.0,"G":64.7,"M":98.7,"vol":37.0,"div":2.9,"dd":-8.9,"esg":51.6,"mcap":"Large ($10B-$200B)"},{"ticker":"ENR","exch":"XFRA","name":"Siemens Energy AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":33.2,"V":51.1,"G":26.4,"M":79.4,"vol":19.5,"div":0.2,"dd":-42.8,"esg":48.9,"mcap":"Small (<$2B)"},{"ticker":"ENX","exch":"XFRA","name":"Euronext NV","country":"Germany","region":"Europe","devtype":"DM","sector":"Software & IT Services","Q":62.1,"V":88.9,"G":86.7,"M":83.5,"vol":50.8,"div":0,"dd":-60.0,"esg":39.6,"mcap":"Large ($10B-$200B)"},{"ticker":"EOG","exch":"XNYS","name":"EOG RESOURCES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":57.8,"V":37.2,"G":62.1,"M":91.3,"vol":49.1,"div":0.2,"dd":-31.1,"esg":57.9,"mcap":"Large ($10B-$200B)"},{"ticker":"EQT","exch":"XNYS","name":"EQT CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":34.4,"V":27.6,"G":30.1,"M":18.4,"vol":15.7,"div":4.1,"dd":-56.1,"esg":51.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"ETN","exch":"XNYS","name":"EATON CORPORATION PUBLIC LIMITED COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":73.8,"V":40.8,"G":34.8,"M":45.6,"vol":33.7,"div":3.6,"dd":-59.0,"esg":53.1,"mcap":"Large ($10B-$200B)"},{"ticker":"EVO","exch":"XNAS","name":"Evotec SE","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":33.3,"V":84.2,"G":78.0,"M":22.3,"vol":42.2,"div":0.3,"dd":-25.7,"esg":72.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"EVRG","exch":"XNAS","name":"Evergy, Inc.","country":"United States","region":"North America","devtype":"DM","sector":"Utilities","Q":53.1,"V":24.6,"G":51.3,"M":57.2,"vol":33.0,"div":3.6,"dd":-39.2,"esg":28.5,"mcap":"Mega (>$200B)"},{"ticker":"EW","exch":"XNYS","name":"EDWARDS LIFESCIENCES CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":62.7,"V":15.6,"G":13.3,"M":19.3,"vol":35.4,"div":3.1,"dd":-9.8,"esg":28.1,"mcap":"Large ($10B-$200B)"},{"ticker":"EXPD","exch":"XNYS","name":"EXPEDITORS INTERNATIONAL OF WASHINGTON, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":85.7,"V":84.0,"G":71.3,"M":67.9,"vol":47.0,"div":5.5,"dd":-33.6,"esg":27.6,"mcap":"Mid ($2B-$10B)"},{"ticker":"EXPE","exch":"XNAS","name":"EXPEDIA GROUP, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Internet, Media & Entertainment","Q":55.8,"V":29.0,"G":18.9,"M":10.5,"vol":45.1,"div":0.5,"dd":-47.5,"esg":25.8,"mcap":"Large ($10B-$200B)"},{"ticker":"EXPN","exch":"XLON","name":"EXPERIAN PLC","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Software & IT Services","Q":76.9,"V":22.9,"G":77.5,"M":8.9,"vol":38.2,"div":0,"dd":-50.1,"esg":95.0,"mcap":"Large ($10B-$200B)"},{"ticker":"F","exch":"XNYS","name":"FORD MOTOR COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Automobiles & Components","Q":30.1,"V":94.3,"G":29.3,"M":16.6,"vol":36.2,"div":1.1,"dd":-62.5,"esg":46.5,"mcap":"Mid ($2B-$10B)"},{"ticker":"FAST","exch":"XNAS","name":"FASTENAL COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":71.1,"V":88.3,"G":80.4,"M":92.4,"vol":17.5,"div":0,"dd":-15.7,"esg":47.2,"mcap":"Small (<$2B)"},{"ticker":"FBK","exch":"XMIL","name":"FinecoBank Banca Fineco SpA","country":"Italy","region":"Europe","devtype":"DM","sector":"Financials","Q":24.0,"V":70.2,"G":24.1,"M":48.0,"vol":38.8,"div":0,"dd":-47.4,"esg":26.2,"mcap":"Large ($10B-$200B)"},{"ticker":"FCX","exch":"XNYS","name":"FREEPORT-MCMORAN INC.","country":"United States","region":"North America","devtype":"DM","sector":"Materials & Chemicals","Q":49.4,"V":72.6,"G":39.4,"M":11.9,"vol":13.9,"div":0,"dd":-64.2,"esg":27.8,"mcap":"Mid ($2B-$10B)"},{"ticker":"FDS","exch":"XNYS","name":"FACTSET RESEARCH SYSTEMS INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":62.5,"V":30.2,"G":36.8,"M":13.8,"vol":20.4,"div":5.2,"dd":-16.1,"esg":40.3,"mcap":"Mega (>$200B)"},{"ticker":"FFIV","exch":"XNAS","name":"F5, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":50.1,"V":54.5,"G":84.9,"M":52.5,"vol":40.7,"div":1.6,"dd":-10.3,"esg":64.6,"mcap":"Large ($10B-$200B)"},{"ticker":"FICO","exch":"XNYS","name":"FAIR ISAAC CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":83.8,"V":19.2,"G":58.8,"M":74.3,"vol":54.3,"div":0.9,"dd":-29.9,"esg":64.5,"mcap":"Small (<$2B)"},{"ticker":"FIX","exch":"XNYS","name":"COMFORT SYSTEMS USA, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":95.5,"V":66.5,"G":72.9,"M":32.2,"vol":19.7,"div":0.2,"dd":-58.9,"esg":67.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"FME","exch":"XFRA","name":"Fresenius Medical Care AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":84.8,"V":40.7,"G":49.8,"M":93.7,"vol":47.0,"div":1.5,"dd":-13.0,"esg":76.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"FOX","exch":"XNAS","name":"FOX CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":39.5,"V":93.9,"G":43.3,"M":18.0,"vol":27.8,"div":1.7,"dd":-29.3,"esg":53.5,"mcap":"Small (<$2B)"},{"ticker":"FRE","exch":"XETR","name":"Fresenius SE & Co KGaA","country":"Germany","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":61.7,"V":15.1,"G":40.2,"M":24.9,"vol":45.0,"div":3.4,"dd":-47.6,"esg":47.3,"mcap":"Small (<$2B)"},{"ticker":"FRES","exch":"XLON","name":"FRESNILLO PLC","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Materials & Chemicals","Q":45.7,"V":26.1,"G":24.5,"M":61.0,"vol":31.5,"div":2.0,"dd":-26.7,"esg":59.3,"mcap":"Mid ($2B-$10B)"},{"ticker":"FRO","exch":"XNYS","name":"FRONTLINE PLC","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":22.0,"V":49.7,"G":73.8,"M":76.5,"vol":49.4,"div":3.5,"dd":-60.8,"esg":35.0,"mcap":"Large ($10B-$200B)"},{"ticker":"FSLR","exch":"XNAS","name":"FIRST SOLAR, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":80.8,"V":62.9,"G":66.1,"M":78.6,"vol":52.9,"div":1.1,"dd":-32.0,"esg":32.2,"mcap":"Small (<$2B)"},{"ticker":"FTNT","exch":"XNAS","name":"FORTINET, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":96.9,"V":40.0,"G":74.5,"M":79.2,"vol":45.1,"div":2.6,"dd":-58.7,"esg":74.4,"mcap":"Mega (>$200B)"},{"ticker":"G1A","exch":"XETR","name":"GEA Group AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":36.9,"V":29.1,"G":76.7,"M":49.3,"vol":25.3,"div":2.5,"dd":-47.0,"esg":61.2,"mcap":"Mega (>$200B)"},{"ticker":"GD","exch":"XNYS","name":"GENERAL DYNAMICS CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Aerospace & Defense","Q":77.0,"V":85.8,"G":47.0,"M":14.5,"vol":19.3,"div":5.0,"dd":-24.0,"esg":44.0,"mcap":"Mid ($2B-$10B)"},{"ticker":"GDDY","exch":"XNYS","name":"GODADDY INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":94.1,"V":27.1,"G":71.3,"M":71.0,"vol":41.9,"div":4.6,"dd":-23.7,"esg":72.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"GEBN","exch":"XSWX","name":"Geberit AG","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":21.3,"V":34.1,"G":89.9,"M":45.4,"vol":17.7,"div":3.8,"dd":-12.3,"esg":49.0,"mcap":"Mid ($2B-$10B)"},{"ticker":"GEHC","exch":"XNAS","name":"GE HEALTHCARE TECHNOLOGIES INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":93.1,"V":84.5,"G":32.6,"M":24.0,"vol":49.9,"div":4.4,"dd":-8.5,"esg":76.3,"mcap":"Mid ($2B-$10B)"},{"ticker":"GEV","exch":"XNYS","name":"GE VERNOVA INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":29.7,"V":95.3,"G":25.1,"M":47.9,"vol":33.1,"div":1.4,"dd":-11.9,"esg":74.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"GILD","exch":"XNAS","name":"GILEAD SCIENCES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":97.0,"V":43.1,"G":45.6,"M":34.0,"vol":23.7,"div":2.6,"dd":-11.4,"esg":29.6,"mcap":"Mid ($2B-$10B)"},{"ticker":"GIVN","exch":"XSWX","name":"Givaudan Ltd","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":29.3,"V":21.9,"G":53.8,"M":73.2,"vol":45.9,"div":5.1,"dd":-32.1,"esg":34.5,"mcap":"Mid ($2B-$10B)"},{"ticker":"GLW","exch":"XNYS","name":"CORNING INCORPORATED","country":"United States","region":"North America","devtype":"DM","sector":"Industrials - Trading & Conglomerates","Q":78.9,"V":29.4,"G":40.2,"M":73.8,"vol":54.6,"div":0,"dd":-10.1,"esg":60.7,"mcap":"Small (<$2B)"},{"ticker":"GNRC","exch":"XNYS","name":"GENERAC HOLDINGS INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":69.7,"V":75.1,"G":16.9,"M":6.2,"vol":47.2,"div":1.4,"dd":-46.4,"esg":38.6,"mcap":"Small (<$2B)"},{"ticker":"GOOG","exch":"XNAS","name":"ALPHABET INC.","country":"United States","region":"North America","devtype":"DM","sector":"Internet, Media & Entertainment","Q":82.9,"V":89.3,"G":51.9,"M":93.6,"vol":49.5,"div":0,"dd":-50.5,"esg":28.8,"mcap":"Small (<$2B)"},{"ticker":"GRMN","exch":"XNYS","name":"Garmin Ltd","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":36.9,"V":59.3,"G":56.3,"M":76.2,"vol":36.5,"div":0,"dd":-42.3,"esg":45.0,"mcap":"Large ($10B-$200B)"},{"ticker":"GSK","exch":"XLON","name":"GSK PLC","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":52.8,"V":53.6,"G":57.6,"M":40.2,"vol":19.4,"div":4.0,"dd":-10.0,"esg":47.3,"mcap":"Mega (>$200B)"},{"ticker":"GTT","exch":"XWBO","name":"Gaztransport et Technigaz SA","country":"Austria","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":25.4,"V":44.2,"G":40.1,"M":95.1,"vol":47.2,"div":0,"dd":-8.4,"esg":90.5,"mcap":"Large ($10B-$200B)"},{"ticker":"GWW","exch":"XNYS","name":"W.W. GRAINGER, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":82.2,"V":82.0,"G":57.6,"M":8.8,"vol":52.0,"div":2.0,"dd":-24.3,"esg":26.2,"mcap":"Small (<$2B)"},{"ticker":"HAL","exch":"XWBO","name":"HALLIBURTON COMPANY","country":"Austria","region":"Europe","devtype":"DM","sector":"Energy","Q":93.2,"V":69.4,"G":65.9,"M":32.7,"vol":25.4,"div":4.7,"dd":-53.7,"esg":50.8,"mcap":"Large ($10B-$200B)"},{"ticker":"HCA","exch":"XNYS","name":"HCA HEALTHCARE, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":53.9,"V":61.6,"G":88.0,"M":22.5,"vol":43.1,"div":1.6,"dd":-34.0,"esg":46.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"HD","exch":"XNYS","name":"THE HOME DEPOT, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":39.6,"V":90.1,"G":23.8,"M":49.6,"vol":46.9,"div":0.8,"dd":-12.0,"esg":30.2,"mcap":"Large ($10B-$200B)"},{"ticker":"HLMA","exch":"XLON","name":"HALMA PUBLIC LIMITED COMPANY","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":42.3,"V":92.5,"G":91.7,"M":19.0,"vol":50.2,"div":3.6,"dd":-26.4,"esg":86.7,"mcap":"Mega (>$200B)"},{"ticker":"HLT","exch":"XNYS","name":"HILTON WORLDWIDE HOLDINGS INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":30.8,"V":58.1,"G":10.7,"M":22.9,"vol":31.9,"div":4.1,"dd":-62.8,"esg":94.6,"mcap":"Large ($10B-$200B)"},{"ticker":"HO","exch":"XPAR","name":"Thales SA","country":"France","region":"Europe","devtype":"DM","sector":"Aerospace & Defense","Q":26.7,"V":26.8,"G":86.6,"M":76.0,"vol":12.3,"div":0,"dd":-37.3,"esg":27.0,"mcap":"Large ($10B-$200B)"},{"ticker":"HOT","exch":"XFRA","name":"Hochtief AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":53.7,"V":93.6,"G":25.0,"M":26.9,"vol":53.7,"div":0.3,"dd":-17.5,"esg":47.7,"mcap":"Large ($10B-$200B)"},{"ticker":"HPQ","exch":"XNYS","name":"HP INC.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":95.9,"V":17.6,"G":43.4,"M":98.5,"vol":41.4,"div":5.3,"dd":-10.9,"esg":81.5,"mcap":"Large ($10B-$200B)"},{"ticker":"HSY","exch":"XNYS","name":"THE HERSHEY COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Staples","Q":47.7,"V":51.5,"G":13.3,"M":26.7,"vol":36.6,"div":1.5,"dd":-44.1,"esg":87.6,"mcap":"Mid ($2B-$10B)"},{"ticker":"HUBB","exch":"XNYS","name":"HUBBELL INCORPORATED","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":83.6,"V":39.3,"G":31.9,"M":71.5,"vol":48.0,"div":2.3,"dd":-34.7,"esg":75.0,"mcap":"Small (<$2B)"},{"ticker":"HWM","exch":"XNYS","name":"HOWMET AEROSPACE INC.","country":"United States","region":"North America","devtype":"DM","sector":"Aerospace & Defense","Q":59.4,"V":81.8,"G":17.2,"M":16.4,"vol":19.1,"div":1.3,"dd":-61.4,"esg":46.1,"mcap":"Small (<$2B)"},{"ticker":"IAG","exch":"XNYS","name":"IAMGOLD CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Materials & Chemicals","Q":78.5,"V":94.8,"G":74.5,"M":12.2,"vol":34.1,"div":0,"dd":-55.8,"esg":68.9,"mcap":"Mega (>$200B)"},{"ticker":"ICE","exch":"XNYS","name":"INTERCONTINENTAL EXCHANGE, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":94.8,"V":96.7,"G":65.0,"M":56.7,"vol":50.2,"div":3.1,"dd":-60.0,"esg":50.5,"mcap":"Mid ($2B-$10B)"},{"ticker":"IDXX","exch":"XNAS","name":"IDEXX LABORATORIES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":55.2,"V":28.0,"G":68.5,"M":61.2,"vol":52.8,"div":5.2,"dd":-39.2,"esg":91.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"IEX","exch":"XNYS","name":"IDEX CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":45.9,"V":46.0,"G":63.9,"M":43.4,"vol":43.5,"div":5.0,"dd":-11.7,"esg":26.1,"mcap":"Mega (>$200B)"},{"ticker":"IFX","exch":"XFRA","name":"Infineon Technologies AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":68.3,"V":83.2,"G":93.4,"M":40.4,"vol":36.1,"div":3.7,"dd":-41.8,"esg":91.3,"mcap":"Mega (>$200B)"},{"ticker":"L","exch":"XNYS","name":"LOEWS CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Industrials - Trading & Conglomerates","Q":29.3,"V":87.2,"G":65.4,"M":90.1,"vol":32.1,"div":4.7,"dd":-22.4,"esg":29.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"IMB","exch":"XLON","name":"IMPERIAL BRANDS PLC","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Consumer Staples","Q":29.6,"V":91.3,"G":82.5,"M":55.7,"vol":14.8,"div":0,"dd":-47.9,"esg":33.0,"mcap":"Mid ($2B-$10B)"},{"ticker":"IMI","exch":"XLON","name":"IMI PLC","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":34.5,"V":94.3,"G":88.1,"M":94.8,"vol":48.0,"div":0,"dd":-58.7,"esg":70.5,"mcap":"Small (<$2B)"},{"ticker":"INCY","exch":"XNAS","name":"INCYTE CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":78.4,"V":62.0,"G":79.9,"M":14.6,"vol":12.9,"div":3.6,"dd":-33.2,"esg":91.7,"mcap":"Large ($10B-$200B)"},{"ticker":"INDT","exch":"XSTO","name":"Indutrade AB","country":"Sweden","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":92.5,"V":48.5,"G":80.3,"M":65.6,"vol":31.2,"div":0.4,"dd":-47.8,"esg":33.7,"mcap":"Small (<$2B)"},{"ticker":"INTU","exch":"XNAS","name":"INTUIT INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":95.7,"V":92.3,"G":25.4,"M":67.2,"vol":33.9,"div":1.2,"dd":-62.5,"esg":43.5,"mcap":"Mega (>$200B)"},{"ticker":"IPN","exch":"XPAR","name":"Ipsen SA","country":"France","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":25.6,"V":87.9,"G":63.6,"M":55.3,"vol":24.2,"div":0,"dd":-16.3,"esg":60.9,"mcap":"Small (<$2B)"},{"ticker":"IQV","exch":"XNYS","name":"IQVIA HOLDINGS INC","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":62.7,"V":91.5,"G":18.3,"M":55.2,"vol":49.4,"div":4.0,"dd":-33.4,"esg":55.1,"mcap":"Mega (>$200B)"},{"ticker":"IR","exch":"XNYS","name":"INGERSOLL RAND INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":37.5,"V":91.0,"G":25.1,"M":17.5,"vol":16.9,"div":3.0,"dd":-59.7,"esg":46.5,"mcap":"Small (<$2B)"},{"ticker":"ISRG","exch":"XNAS","name":"INTUITIVE SURGICAL, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":49.9,"V":77.3,"G":52.6,"M":7.7,"vol":31.5,"div":0,"dd":-38.8,"esg":38.0,"mcap":"Large ($10B-$200B)"},{"ticker":"IT","exch":"XNYS","name":"GARTNER, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":93.9,"V":44.0,"G":36.5,"M":65.8,"vol":21.6,"div":0.3,"dd":-44.9,"esg":61.9,"mcap":"Large ($10B-$200B)"},{"ticker":"ITRK","exch":"XLON","name":"INTERTEK GROUP PLC","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":25.1,"V":21.7,"G":43.5,"M":20.5,"vol":28.4,"div":3.4,"dd":-39.4,"esg":55.5,"mcap":"Large ($10B-$200B)"},{"ticker":"ITW","exch":"XNYS","name":"ILLINOIS TOOL WORKS INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":69.9,"V":56.9,"G":30.8,"M":34.2,"vol":37.6,"div":0.6,"dd":-33.5,"esg":74.0,"mcap":"Mid ($2B-$10B)"},{"ticker":"ITX","exch":"BMEX","name":"Industria de Diseno Textil SA","country":"Spain","region":"Europe","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":22.0,"V":88.2,"G":57.9,"M":70.1,"vol":37.9,"div":3.2,"dd":-57.7,"esg":63.7,"mcap":"Mega (>$200B)"},{"ticker":"IVZ","exch":"XNYS","name":"INVESCO LTD","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":52.9,"V":89.3,"G":53.4,"M":93.7,"vol":49.7,"div":5.4,"dd":-11.1,"esg":31.7,"mcap":"Mega (>$200B)"},{"ticker":"JBHT","exch":"XNAS","name":"J. B. HUNT TRANSPORT SERVICES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":28.4,"V":36.1,"G":52.2,"M":7.5,"vol":27.7,"div":1.5,"dd":-42.8,"esg":60.5,"mcap":"Mid ($2B-$10B)"},{"ticker":"JBL","exch":"XNYS","name":"JABIL INC.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":49.3,"V":63.1,"G":25.2,"M":48.3,"vol":40.0,"div":3.9,"dd":-62.1,"esg":85.7,"mcap":"Large ($10B-$200B)"},{"ticker":"JCI","exch":"XNYS","name":"JOHNSON CONTROLS INTERNATIONAL PUBLIC LIMITED COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":89.8,"V":67.5,"G":26.1,"M":96.3,"vol":40.8,"div":0.7,"dd":-64.4,"esg":30.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"JKHY","exch":"XNAS","name":"JACK HENRY & ASSOCIATES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":52.6,"V":52.9,"G":61.6,"M":43.7,"vol":20.4,"div":3.2,"dd":-54.7,"esg":65.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"JMT","exch":"XLIS","name":"Jeronimo Martins SGPS SA","country":"Portugal","region":"Europe","devtype":"DM","sector":"Consumer Staples","Q":68.9,"V":59.7,"G":56.5,"M":45.1,"vol":46.4,"div":0,"dd":-22.6,"esg":43.2,"mcap":"Mega (>$200B)"},{"ticker":"JNJ","exch":"XNYS","name":"JOHNSON & JOHNSON","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":93.4,"V":65.9,"G":61.5,"M":61.6,"vol":29.7,"div":5.3,"dd":-53.4,"esg":37.1,"mcap":"Large ($10B-$200B)"},{"ticker":"KBX","exch":"XFRA","name":"Knorr Bremse AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":82.3,"V":57.9,"G":48.5,"M":93.4,"vol":37.7,"div":2.0,"dd":-26.0,"esg":39.4,"mcap":"Small (<$2B)"},{"ticker":"KCR","exch":"XHEL","name":"Konecranes Oyj","country":"Finland","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":82.1,"V":28.7,"G":26.0,"M":19.3,"vol":20.4,"div":5.2,"dd":-47.1,"esg":41.6,"mcap":"Small (<$2B)"},{"ticker":"KESKOB","exch":"XHEL","name":"Kesko Corporation","country":"Finland","region":"Europe","devtype":"DM","sector":"Consumer Staples","Q":79.6,"V":41.5,"G":69.6,"M":32.5,"vol":34.4,"div":2.9,"dd":-42.1,"esg":37.3,"mcap":"Mid ($2B-$10B)"},{"ticker":"KEYS","exch":"XNYS","name":"KEYSIGHT TECHNOLOGIES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":20.8,"V":96.5,"G":64.6,"M":93.2,"vol":20.8,"div":5.3,"dd":-22.1,"esg":75.1,"mcap":"Small (<$2B)"},{"ticker":"KGH","exch":"XWAR","name":"KGHM Polska Miedz SA","country":"Poland","region":"Europe","devtype":"EM","sector":"Materials & Chemicals","Q":26.0,"V":96.4,"G":50.5,"M":71.1,"vol":44.2,"div":0,"dd":-14.0,"esg":62.4,"mcap":"Large ($10B-$200B)"},{"ticker":"KLAC","exch":"XNAS","name":"KLA CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":20.7,"V":59.8,"G":11.7,"M":83.2,"vol":49.0,"div":3.2,"dd":-52.4,"esg":60.9,"mcap":"Small (<$2B)"},{"ticker":"KMB","exch":"XNAS","name":"KIMBERLY-CLARK CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Staples","Q":57.3,"V":58.4,"G":80.4,"M":77.4,"vol":39.9,"div":0,"dd":-37.7,"esg":46.2,"mcap":"Mid ($2B-$10B)"},{"ticker":"KNEBV","exch":"XHEL","name":"KONE Corporation","country":"Finland","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":38.2,"V":76.8,"G":62.1,"M":21.6,"vol":32.1,"div":5.3,"dd":-46.6,"esg":87.0,"mcap":"Large ($10B-$200B)"},{"ticker":"KNIN","exch":"XSWX","name":"Kuhne + Nagel International Ltd.","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":31.0,"V":59.3,"G":37.8,"M":80.5,"vol":36.4,"div":2.7,"dd":-44.9,"esg":28.6,"mcap":"Mid ($2B-$10B)"},{"ticker":"KO","exch":"XNYS","name":"THE COCA-COLA COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Staples","Q":66.5,"V":51.9,"G":37.4,"M":5.4,"vol":26.9,"div":0.8,"dd":-12.7,"esg":34.8,"mcap":"Small (<$2B)"},{"ticker":"KOG","exch":"XOSL","name":"Kongsberg Gruppen ASA","country":"Norway","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":72.9,"V":43.9,"G":11.4,"M":41.0,"vol":40.2,"div":4.6,"dd":-43.6,"esg":48.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"KVUE","exch":"XNYS","name":"KENVUE INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Staples","Q":71.7,"V":20.7,"G":94.9,"M":81.6,"vol":23.0,"div":0.8,"dd":-63.1,"esg":74.6,"mcap":"Small (<$2B)"},{"ticker":"LDO","exch":"XMIL","name":"Leonardo SpA","country":"Italy","region":"Europe","devtype":"DM","sector":"Aerospace & Defense","Q":41.6,"V":16.4,"G":43.2,"M":85.9,"vol":34.8,"div":3.9,"dd":-62.2,"esg":42.6,"mcap":"Mid ($2B-$10B)"},{"ticker":"LDOS","exch":"XNYS","name":"LEIDOS HOLDINGS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Aerospace & Defense","Q":59.6,"V":45.5,"G":46.4,"M":96.7,"vol":29.9,"div":1.4,"dd":-59.0,"esg":59.0,"mcap":"Small (<$2B)"},{"ticker":"LEN","exch":"XNYS","name":"LENNAR CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Real Estate & Construction","Q":67.6,"V":51.6,"G":35.0,"M":46.4,"vol":46.4,"div":3.6,"dd":-8.7,"esg":34.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"LHA","exch":"XETR","name":"Deutsche Lufthansa AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Telecom & Communication Services","Q":84.4,"V":20.3,"G":87.6,"M":93.3,"vol":26.3,"div":5.3,"dd":-45.5,"esg":53.7,"mcap":"Mega (>$200B)"},{"ticker":"LII","exch":"XNYS","name":"LENNOX INTERNATIONAL INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":71.5,"V":15.3,"G":11.3,"M":65.9,"vol":52.9,"div":3.5,"dd":-50.2,"esg":36.2,"mcap":"Mega (>$200B)"},{"ticker":"LLY","exch":"XNYS","name":"ELI LILLY AND COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":27.1,"V":31.8,"G":37.7,"M":10.2,"vol":49.1,"div":0,"dd":-57.7,"esg":77.3,"mcap":"Mega (>$200B)"},{"ticker":"LMT","exch":"XNYS","name":"LOCKHEED MARTIN CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Aerospace & Defense","Q":88.9,"V":62.2,"G":50.1,"M":45.0,"vol":13.7,"div":3.8,"dd":-47.7,"esg":75.2,"mcap":"Small (<$2B)"},{"ticker":"LOGN","exch":"XSWX","name":"Logitech international SA","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":42.8,"V":70.0,"G":73.3,"M":78.4,"vol":21.9,"div":4.9,"dd":-21.2,"esg":91.0,"mcap":"Mega (>$200B)"},{"ticker":"LONN","exch":"XSWX","name":"Lonza Group Ltd","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":38.4,"V":33.6,"G":15.5,"M":97.5,"vol":33.1,"div":2.7,"dd":-44.8,"esg":38.8,"mcap":"Large ($10B-$200B)"},{"ticker":"LOTB","exch":"XBRU","name":"Lotus Bakeries NV","country":"Belgium","region":"Europe","devtype":"DM","sector":"Consumer Staples","Q":86.1,"V":24.8,"G":22.5,"M":67.2,"vol":20.1,"div":4.5,"dd":-28.6,"esg":31.0,"mcap":"Small (<$2B)"},{"ticker":"LOW","exch":"XNYS","name":"LOWE'S COMPANIES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":68.1,"V":86.3,"G":81.3,"M":53.2,"vol":19.4,"div":1.7,"dd":-46.2,"esg":53.6,"mcap":"Large ($10B-$200B)"},{"ticker":"LPP","exch":"XWAR","name":"Lpp SA","country":"Poland","region":"Europe","devtype":"EM","sector":"Consumer Staples","Q":23.1,"V":18.6,"G":68.9,"M":60.0,"vol":13.8,"div":3.6,"dd":-17.9,"esg":91.3,"mcap":"Large ($10B-$200B)"},{"ticker":"LRCX","exch":"XNAS","name":"LAM RESEARCH CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":76.1,"V":52.4,"G":67.8,"M":70.5,"vol":30.6,"div":2.5,"dd":-41.9,"esg":76.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"LSEG","exch":"XLON","name":"LONDON STOCK EXCHANGE GROUP PLC","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Software & IT Services","Q":48.1,"V":79.0,"G":21.4,"M":41.6,"vol":40.7,"div":5.0,"dd":-12.2,"esg":85.3,"mcap":"Large ($10B-$200B)"},{"ticker":"LTMC","exch":"XMIL","name":"Lottomatica Group SpA","country":"Italy","region":"Europe","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":40.2,"V":83.3,"G":75.2,"M":87.7,"vol":35.4,"div":0,"dd":-17.8,"esg":72.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"LULU","exch":"XNAS","name":"LULULEMON ATHLETICA INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":64.0,"V":91.1,"G":19.4,"M":96.9,"vol":38.7,"div":1.6,"dd":-62.2,"esg":71.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"MA","exch":"XNYS","name":"MASTERCARD INCORPORATED","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":51.6,"V":19.3,"G":39.9,"M":80.6,"vol":37.2,"div":2.6,"dd":-9.7,"esg":81.2,"mcap":"Large ($10B-$200B)"},{"ticker":"MAR","exch":"XNAS","name":"MARRIOTT INTERNATIONAL, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":76.3,"V":95.2,"G":37.1,"M":21.8,"vol":32.8,"div":0,"dd":-21.9,"esg":89.2,"mcap":"Mega (>$200B)"},{"ticker":"MAS","exch":"XNYS","name":"MASCO CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":22.1,"V":87.0,"G":66.7,"M":71.7,"vol":40.0,"div":0.8,"dd":-35.8,"esg":91.0,"mcap":"Mid ($2B-$10B)"},{"ticker":"MBG","exch":"XFRA","name":"Mercedes-Benz Group AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Automobiles & Components","Q":47.7,"V":32.2,"G":44.6,"M":86.8,"vol":45.0,"div":3.7,"dd":-14.2,"esg":63.9,"mcap":"Large ($10B-$200B)"},{"ticker":"MCK","exch":"XNYS","name":"MCKESSON CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":87.7,"V":66.3,"G":60.6,"M":26.6,"vol":45.4,"div":1.0,"dd":-9.2,"esg":78.5,"mcap":"Mid ($2B-$10B)"},{"ticker":"MCO","exch":"XNYS","name":"MOODY'S CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":48.3,"V":96.1,"G":88.7,"M":57.5,"vol":18.7,"div":0,"dd":-48.1,"esg":93.3,"mcap":"Mega (>$200B)"},{"ticker":"MDT","exch":"XNYS","name":"MEDTRONIC PUBLIC LIMITED COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":52.3,"V":27.4,"G":20.6,"M":32.9,"vol":29.9,"div":3.8,"dd":-37.4,"esg":82.2,"mcap":"Mid ($2B-$10B)"},{"ticker":"META","exch":"XNAS","name":"META PLATFORMS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Internet, Media & Entertainment","Q":75.0,"V":61.7,"G":90.3,"M":60.3,"vol":36.4,"div":0.4,"dd":-18.2,"esg":74.0,"mcap":"Mega (>$200B)"},{"ticker":"METSO","exch":"XHEL","name":"Metso Oyj","country":"Finland","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":89.2,"V":52.1,"G":71.1,"M":44.4,"vol":19.3,"div":0,"dd":-14.8,"esg":36.8,"mcap":"Mega (>$200B)"},{"ticker":"MKC","exch":"XNYS","name":"MCCORMICK & COMPANY, INCORPORATED","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Staples","Q":79.8,"V":93.4,"G":91.6,"M":76.8,"vol":14.7,"div":0,"dd":-39.6,"esg":40.5,"mcap":"Mega (>$200B)"},{"ticker":"ML","exch":"XPAR","name":"Compagnie Generale des Etablissements Michelin SCA","country":"France","region":"Europe","devtype":"DM","sector":"Automobiles & Components","Q":93.5,"V":65.4,"G":12.7,"M":57.3,"vol":19.7,"div":5.0,"dd":-46.8,"esg":42.8,"mcap":"Small (<$2B)"},{"ticker":"MMM","exch":"XNYS","name":"3M COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":94.8,"V":54.7,"G":36.4,"M":37.0,"vol":43.3,"div":1.1,"dd":-53.9,"esg":29.5,"mcap":"Small (<$2B)"},{"ticker":"MNST","exch":"XNAS","name":"MONSTER BEVERAGE CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Staples","Q":83.8,"V":35.2,"G":54.2,"M":71.8,"vol":24.3,"div":2.7,"dd":-62.7,"esg":26.9,"mcap":"Small (<$2B)"},{"ticker":"MO","exch":"XNYS","name":"Altria Group, Inc.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Staples","Q":53.4,"V":68.6,"G":36.5,"M":51.7,"vol":37.7,"div":3.5,"dd":-61.7,"esg":80.5,"mcap":"Mega (>$200B)"},{"ticker":"MONC","exch":"XMIL","name":"Moncler SpA","country":"Italy","region":"Europe","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":77.2,"V":62.6,"G":80.0,"M":78.5,"vol":31.3,"div":2.6,"dd":-56.7,"esg":46.4,"mcap":"Small (<$2B)"},{"ticker":"MOWI","exch":"XOSL","name":"Mowi ASA","country":"Norway","region":"Europe","devtype":"DM","sector":"Consumer Staples","Q":59.2,"V":91.0,"G":61.5,"M":53.6,"vol":29.0,"div":4.6,"dd":-19.1,"esg":45.8,"mcap":"Mid ($2B-$10B)"},{"ticker":"MPC","exch":"XNYS","name":"MARATHON PETROLEUM CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":64.5,"V":60.4,"G":76.8,"M":74.9,"vol":46.3,"div":0,"dd":-28.3,"esg":63.6,"mcap":"Mid ($2B-$10B)"},{"ticker":"MRK","exch":"XFRA","name":"Merck KGaA","country":"Germany","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":31.3,"V":96.6,"G":73.0,"M":95.4,"vol":52.2,"div":4.4,"dd":-39.4,"esg":33.2,"mcap":"Mid ($2B-$10B)"},{"ticker":"MRO","exch":"XLON","name":"MELROSE INDUSTRIES PLC","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":61.6,"V":15.3,"G":16.2,"M":80.1,"vol":37.0,"div":2.9,"dd":-63.3,"esg":57.3,"mcap":"Mega (>$200B)"},{"ticker":"MRSH","exch":"XNYS","name":"MARSH & MCLENNAN COMPANIES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":44.3,"V":43.4,"G":50.2,"M":17.0,"vol":28.8,"div":1.1,"dd":-59.2,"esg":52.4,"mcap":"Large ($10B-$200B)"},{"ticker":"MSCI","exch":"XNYS","name":"MSCI INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":29.0,"V":22.5,"G":64.2,"M":51.5,"vol":20.6,"div":0,"dd":-36.9,"esg":88.4,"mcap":"Mega (>$200B)"},{"ticker":"MSFT","exch":"XNAS","name":"MICROSOFT CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":47.1,"V":47.2,"G":78.0,"M":93.1,"vol":14.7,"div":1.5,"dd":-52.9,"esg":81.7,"mcap":"Large ($10B-$200B)"},{"ticker":"MSI","exch":"XNYS","name":"MOTOROLA SOLUTIONS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":86.6,"V":76.4,"G":14.4,"M":33.9,"vol":36.1,"div":0,"dd":-35.8,"esg":30.3,"mcap":"Mega (>$200B)"},{"ticker":"MTD","exch":"XNYS","name":"METTLER-TOLEDO INTERNATIONAL INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":51.5,"V":78.2,"G":31.9,"M":32.9,"vol":22.6,"div":0,"dd":-24.8,"esg":94.3,"mcap":"Small (<$2B)"},{"ticker":"MTX","exch":"XFRA","name":"MTU Aero Engines AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Aerospace & Defense","Q":37.6,"V":96.5,"G":52.2,"M":80.9,"vol":29.0,"div":4.4,"dd":-62.2,"esg":41.4,"mcap":"Small (<$2B)"},{"ticker":"MU","exch":"XNAS","name":"MICRON TECHNOLOGY, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":60.4,"V":35.6,"G":75.6,"M":33.9,"vol":13.6,"div":0,"dd":-10.8,"esg":34.5,"mcap":"Mid ($2B-$10B)"},{"ticker":"NDA","exch":"XETR","name":"Aurubis AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Materials & Chemicals","Q":30.2,"V":27.9,"G":91.5,"M":81.7,"vol":15.7,"div":4.8,"dd":-43.1,"esg":67.0,"mcap":"Large ($10B-$200B)"},{"ticker":"NDAQ","exch":"XNAS","name":"NASDAQ, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":55.0,"V":32.2,"G":93.7,"M":99.0,"vol":28.9,"div":1.4,"dd":-20.7,"esg":27.1,"mcap":"Mega (>$200B)"},{"ticker":"NDSN","exch":"XNAS","name":"NORDSON CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":84.8,"V":69.6,"G":35.9,"M":33.8,"vol":15.3,"div":2.6,"dd":-64.1,"esg":28.3,"mcap":"Large ($10B-$200B)"},{"ticker":"NDX1","exch":"XFRA","name":"Nordex SE","country":"Germany","region":"Europe","devtype":"DM","sector":"Energy","Q":35.6,"V":64.3,"G":51.7,"M":82.5,"vol":33.0,"div":3.8,"dd":-34.3,"esg":56.8,"mcap":"Small (<$2B)"},{"ticker":"NEM","exch":"XNYS","name":"NEWMONT CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Materials & Chemicals","Q":32.1,"V":28.2,"G":25.6,"M":91.2,"vol":51.4,"div":3.6,"dd":-41.0,"esg":44.6,"mcap":"Mid ($2B-$10B)"},{"ticker":"NEM","exch":"XFRA","name":"Nemetschek SE","country":"Germany","region":"Europe","devtype":"DM","sector":"Materials & Chemicals","Q":43.6,"V":27.3,"G":91.2,"M":18.6,"vol":24.8,"div":0,"dd":-33.7,"esg":30.2,"mcap":"Small (<$2B)"},{"ticker":"NESTE","exch":"XHEL","name":"Neste Oyj","country":"Finland","region":"Europe","devtype":"DM","sector":"Energy","Q":59.9,"V":22.8,"G":51.7,"M":5.9,"vol":31.1,"div":1.9,"dd":-23.9,"esg":54.0,"mcap":"Large ($10B-$200B)"},{"ticker":"NFLX","exch":"XNAS","name":"NETFLIX, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Internet, Media & Entertainment","Q":47.1,"V":20.9,"G":71.3,"M":31.5,"vol":28.1,"div":1.7,"dd":-54.8,"esg":57.4,"mcap":"Small (<$2B)"},{"ticker":"NKE","exch":"XFRA","name":"NIKE, INC.","country":"Germany","region":"Europe","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":70.4,"V":23.3,"G":42.4,"M":86.4,"vol":41.5,"div":4.4,"dd":-50.4,"esg":73.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"NKT","exch":"XETR","name":"Nkt A/S","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":48.0,"V":86.0,"G":90.9,"M":47.3,"vol":27.5,"div":3.9,"dd":-55.6,"esg":60.2,"mcap":"Small (<$2B)"},{"ticker":"NOVN","exch":"XSWX","name":"Novartis Inc.","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":42.0,"V":25.1,"G":75.2,"M":18.6,"vol":15.3,"div":0.4,"dd":-43.2,"esg":82.7,"mcap":"Large ($10B-$200B)"},{"ticker":"NTAP","exch":"XNAS","name":"NETAPP, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":58.1,"V":30.5,"G":63.8,"M":83.6,"vol":34.8,"div":0.6,"dd":-42.6,"esg":72.3,"mcap":"Small (<$2B)"},{"ticker":"NUE","exch":"XNYS","name":"NUCOR CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":47.1,"V":17.7,"G":41.7,"M":45.2,"vol":54.8,"div":4.5,"dd":-52.4,"esg":58.8,"mcap":"Mid ($2B-$10B)"},{"ticker":"NVDA","exch":"XNAS","name":"NVIDIA CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":89.8,"V":32.1,"G":70.4,"M":51.6,"vol":26.1,"div":0,"dd":-41.5,"esg":52.4,"mcap":"Large ($10B-$200B)"},{"ticker":"NVR","exch":"XNYS","name":"NVR, Inc.","country":"United States","region":"North America","devtype":"DM","sector":"Real Estate & Construction","Q":85.0,"V":63.8,"G":29.2,"M":12.8,"vol":42.7,"div":4.4,"dd":-9.6,"esg":82.1,"mcap":"Small (<$2B)"},{"ticker":"NXPI","exch":"XNAS","name":"NXP Semiconductors NV","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":61.3,"V":35.3,"G":89.9,"M":59.7,"vol":31.0,"div":3.8,"dd":-10.2,"esg":85.5,"mcap":"Large ($10B-$200B)"},{"ticker":"ODFL","exch":"XNAS","name":"OLD DOMINION FREIGHT LINE, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":81.3,"V":92.6,"G":26.7,"M":48.7,"vol":16.2,"div":1.4,"dd":-54.5,"esg":36.6,"mcap":"Mega (>$200B)"},{"ticker":"OMC","exch":"XNYS","name":"OMNICOM GROUP INC.","country":"United States","region":"North America","devtype":"DM","sector":"Internet, Media & Entertainment","Q":45.7,"V":48.9,"G":30.6,"M":43.6,"vol":40.4,"div":0,"dd":-9.3,"esg":44.6,"mcap":"Small (<$2B)"},{"ticker":"ON","exch":"XNAS","name":"ON SEMICONDUCTOR CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":24.0,"V":33.4,"G":90.1,"M":37.2,"vol":14.7,"div":3.1,"dd":-52.0,"esg":64.3,"mcap":"Small (<$2B)"},{"ticker":"ORK","exch":"XOSL","name":"Orkla ASA","country":"Norway","region":"Europe","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":30.6,"V":58.7,"G":20.0,"M":87.7,"vol":27.6,"div":5.3,"dd":-60.7,"esg":48.7,"mcap":"Small (<$2B)"},{"ticker":"ORLY","exch":"XNAS","name":"O'Reilly Automotive, Inc.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":20.7,"V":95.8,"G":71.4,"M":24.4,"vol":29.7,"div":1.8,"dd":-34.6,"esg":51.5,"mcap":"Mid ($2B-$10B)"},{"ticker":"ORNBV","exch":"XHEL","name":"Orion Oyj","country":"Finland","region":"Europe","devtype":"DM","sector":"Materials & Chemicals","Q":55.9,"V":63.1,"G":41.5,"M":39.0,"vol":17.1,"div":2.0,"dd":-37.1,"esg":74.8,"mcap":"Mega (>$200B)"},{"ticker":"PCAR","exch":"XNAS","name":"PACCAR INC","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":94.9,"V":89.4,"G":38.1,"M":30.7,"vol":35.7,"div":3.7,"dd":-31.6,"esg":35.0,"mcap":"Large ($10B-$200B)"},{"ticker":"PEP","exch":"XNAS","name":"Pepsico, Inc.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Staples","Q":79.8,"V":42.4,"G":77.7,"M":65.5,"vol":26.7,"div":1.5,"dd":-16.3,"esg":81.4,"mcap":"Small (<$2B)"},{"ticker":"PG","exch":"XNYS","name":"THE PROCTER & GAMBLE COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Staples","Q":94.1,"V":78.1,"G":89.6,"M":64.8,"vol":12.6,"div":0.2,"dd":-58.0,"esg":56.9,"mcap":"Large ($10B-$200B)"},{"ticker":"PGHN","exch":"XSWX","name":"Partners Group Holding AG","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Financials","Q":43.2,"V":54.6,"G":27.4,"M":33.2,"vol":29.9,"div":0,"dd":-53.4,"esg":38.9,"mcap":"Mega (>$200B)"},{"ticker":"PH","exch":"XNYS","name":"PARKER-HANNIFIN CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":86.1,"V":41.5,"G":92.0,"M":80.6,"vol":27.5,"div":0,"dd":-13.0,"esg":25.5,"mcap":"Large ($10B-$200B)"},{"ticker":"PHM","exch":"XNYS","name":"PULTEGROUP, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Real Estate & Construction","Q":54.5,"V":61.9,"G":38.4,"M":69.6,"vol":16.2,"div":2.7,"dd":-13.8,"esg":87.8,"mcap":"Mega (>$200B)"},{"ticker":"PIRC","exch":"XMIL","name":"Pirelli and C. S.p.a","country":"Italy","region":"Europe","devtype":"DM","sector":"Automobiles & Components","Q":29.0,"V":77.8,"G":54.5,"M":46.7,"vol":48.4,"div":5.0,"dd":-44.2,"esg":72.6,"mcap":"Large ($10B-$200B)"},{"ticker":"PKG","exch":"XNYS","name":"PACKAGING CORPORATION OF AMERICA","country":"United States","region":"North America","devtype":"DM","sector":"Materials & Chemicals","Q":54.1,"V":60.7,"G":27.9,"M":91.4,"vol":44.1,"div":4.5,"dd":-31.3,"esg":74.0,"mcap":"Mid ($2B-$10B)"},{"ticker":"PKN","exch":"XWAR","name":"Orlen SA","country":"Poland","region":"Europe","devtype":"EM","sector":"Capital Goods & Industrial Machinery","Q":27.9,"V":84.4,"G":39.0,"M":60.8,"vol":26.2,"div":4.5,"dd":-54.8,"esg":62.7,"mcap":"Mid ($2B-$10B)"},{"ticker":"PM","exch":"XNYS","name":"Philip Morris International Inc.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Staples","Q":46.7,"V":76.0,"G":22.4,"M":51.8,"vol":13.0,"div":5.2,"dd":-9.2,"esg":90.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"PNDORA","exch":"XCSE","name":"Pandora A/S","country":"Denmark","region":"Europe","devtype":"DM","sector":"Consumer Staples","Q":38.4,"V":95.3,"G":55.9,"M":91.8,"vol":30.7,"div":4.3,"dd":-41.9,"esg":91.3,"mcap":"Mid ($2B-$10B)"},{"ticker":"PNR","exch":"XNYS","name":"PENTAIR PUBLIC LIMITED COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":69.6,"V":73.0,"G":69.8,"M":88.3,"vol":38.2,"div":1.6,"dd":-14.3,"esg":82.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"PODD","exch":"XNAS","name":"INSULET CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":95.6,"V":23.3,"G":33.5,"M":96.1,"vol":42.5,"div":0,"dd":-13.7,"esg":50.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"PRY","exch":"XMIL","name":"Prysmian SpA","country":"Italy","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":58.5,"V":17.6,"G":79.4,"M":35.3,"vol":18.7,"div":1.6,"dd":-26.1,"esg":45.8,"mcap":"Large ($10B-$200B)"},{"ticker":"PSX","exch":"XNYS","name":"PHILLIPS 66","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":22.9,"V":75.8,"G":83.2,"M":81.9,"vol":43.3,"div":4.9,"dd":-31.6,"esg":79.3,"mcap":"Small (<$2B)"},{"ticker":"PTC","exch":"XNAS","name":"PTC INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":41.1,"V":19.9,"G":37.6,"M":52.4,"vol":27.8,"div":0.5,"dd":-59.8,"esg":54.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"PYPL","exch":"XNAS","name":"PAYPAL HOLDINGS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":53.8,"V":80.8,"G":37.9,"M":52.0,"vol":38.1,"div":3.2,"dd":-27.9,"esg":36.7,"mcap":"Mega (>$200B)"},{"ticker":"QCOM","exch":"XNAS","name":"QUALCOMM INCORPORATED","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":74.8,"V":31.1,"G":62.1,"M":29.5,"vol":14.3,"div":0,"dd":-43.4,"esg":56.6,"mcap":"Small (<$2B)"},{"ticker":"QIA","exch":"XFRA","name":"Qiagen NV","country":"Germany","region":"Europe","devtype":"DM","sector":"Software & IT Services","Q":37.0,"V":30.9,"G":77.2,"M":31.3,"vol":26.6,"div":4.4,"dd":-53.5,"esg":43.8,"mcap":"Small (<$2B)"},{"ticker":"RAA","exch":"XFRA","name":"Rational AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":31.4,"V":78.5,"G":20.4,"M":7.4,"vol":42.1,"div":2.2,"dd":-46.9,"esg":54.1,"mcap":"Mega (>$200B)"},{"ticker":"RACE","exch":"XMIL","name":"Ferrari NV","country":"Italy","region":"Europe","devtype":"DM","sector":"Automobiles & Components","Q":62.9,"V":91.6,"G":49.8,"M":44.1,"vol":39.0,"div":1.8,"dd":-54.6,"esg":32.9,"mcap":"Small (<$2B)"},{"ticker":"REGN","exch":"XNAS","name":"REGENERON PHARMACEUTICALS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":39.5,"V":18.3,"G":33.7,"M":65.5,"vol":52.0,"div":3.8,"dd":-42.4,"esg":80.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"REL","exch":"XLON","name":"RELX PLC","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Software & IT Services","Q":33.8,"V":27.2,"G":82.8,"M":89.0,"vol":51.2,"div":3.1,"dd":-54.1,"esg":57.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"RHM","exch":"XFRA","name":"Rheinmetall AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Aerospace & Defense","Q":53.6,"V":88.9,"G":53.0,"M":23.1,"vol":41.5,"div":0.2,"dd":-10.1,"esg":60.0,"mcap":"Mid ($2B-$10B)"},{"ticker":"RIO","exch":"XNYS","name":"RIO TINTO PLC","country":"United States","region":"North America","devtype":"DM","sector":"Materials & Chemicals","Q":36.9,"V":61.2,"G":17.1,"M":45.1,"vol":25.0,"div":3.4,"dd":-43.7,"esg":61.9,"mcap":"Large ($10B-$200B)"},{"ticker":"RJF","exch":"XNYS","name":"RAYMOND JAMES FINANCIAL, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":88.7,"V":43.5,"G":94.2,"M":10.6,"vol":48.1,"div":2.0,"dd":-18.8,"esg":35.9,"mcap":"Large ($10B-$200B)"},{"ticker":"RMD","exch":"XNYS","name":"RESMED INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":39.0,"V":91.5,"G":59.2,"M":56.7,"vol":46.4,"div":0,"dd":-36.9,"esg":29.2,"mcap":"Large ($10B-$200B)"},{"ticker":"RMS","exch":"XPAR","name":"Hermes International SCA","country":"France","region":"Europe","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":41.0,"V":15.4,"G":60.6,"M":46.7,"vol":20.6,"div":2.4,"dd":-52.2,"esg":87.5,"mcap":"Large ($10B-$200B)"},{"ticker":"R903","exch":"XFRA","name":"Rockwool A/S","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":23.7,"V":39.2,"G":16.9,"M":5.0,"vol":30.1,"div":4.4,"dd":-16.0,"esg":75.7,"mcap":"Small (<$2B)"},{"ticker":"ROK","exch":"XNYS","name":"ROCKWELL AUTOMATION, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":74.0,"V":33.1,"G":81.0,"M":41.7,"vol":54.8,"div":0,"dd":-19.2,"esg":46.2,"mcap":"Small (<$2B)"},{"ticker":"ROL","exch":"XNYS","name":"ROLLINS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":87.9,"V":65.2,"G":69.6,"M":90.4,"vol":36.9,"div":0.6,"dd":-25.7,"esg":32.8,"mcap":"Large ($10B-$200B)"},{"ticker":"ROP","exch":"XNAS","name":"ROPER TECHNOLOGIES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":92.0,"V":19.9,"G":87.2,"M":70.8,"vol":50.5,"div":1.0,"dd":-61.0,"esg":36.0,"mcap":"Mega (>$200B)"},{"ticker":"ROST","exch":"XNAS","name":"ROSS STORES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":35.0,"V":71.6,"G":79.4,"M":56.5,"vol":24.4,"div":4.3,"dd":-25.6,"esg":87.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"RRN","exch":"XMEX","name":"ROLLS-ROYCE HOLDINGS PLC","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Aerospace & Defense","Q":36.9,"V":60.5,"G":73.7,"M":17.5,"vol":34.8,"div":1.3,"dd":-52.5,"esg":78.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"RXL","exch":"XPAR","name":"Rexel SA","country":"France","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":79.3,"V":89.1,"G":93.1,"M":95.7,"vol":39.9,"div":4.2,"dd":-39.3,"esg":74.8,"mcap":"Mid ($2B-$10B)"},{"ticker":"RYA","exch":"XDUB","name":"RYANAIR HOLDINGS PUBLIC LIMITED COMPANY","country":"Ireland","region":"Europe","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":79.6,"V":64.1,"G":90.6,"M":86.0,"vol":38.2,"div":0,"dd":-20.0,"esg":86.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"SAF","exch":"XPAR","name":"Safran SA","country":"France","region":"Europe","devtype":"DM","sector":"Aerospace & Defense","Q":75.2,"V":70.2,"G":75.5,"M":88.7,"vol":43.0,"div":2.0,"dd":-16.5,"esg":74.7,"mcap":"Large ($10B-$200B)"},{"ticker":"SAND","exch":"XSTO","name":"Sandvik AB","country":"Sweden","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":95.3,"V":87.7,"G":36.3,"M":22.2,"vol":47.7,"div":3.4,"dd":-30.4,"esg":63.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"SAP","exch":"XFRA","name":"SAP SE","country":"Germany","region":"Europe","devtype":"DM","sector":"Software & IT Services","Q":37.1,"V":25.8,"G":15.8,"M":79.4,"vol":17.1,"div":0,"dd":-44.6,"esg":72.2,"mcap":"Small (<$2B)"},{"ticker":"SAVE","exch":"XPAR","name":"Savencia SA","country":"France","region":"Europe","devtype":"DM","sector":"Consumer Staples","Q":59.2,"V":17.5,"G":94.8,"M":81.7,"vol":40.7,"div":5.2,"dd":-33.6,"esg":81.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"SBUX","exch":"XNAS","name":"STARBUCKS CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":39.3,"V":79.3,"G":35.4,"M":92.4,"vol":26.3,"div":2.9,"dd":-25.0,"esg":32.4,"mcap":"Small (<$2B)"},{"ticker":"SCHW","exch":"XNYS","name":"THE CHARLES SCHWAB CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":35.1,"V":42.9,"G":20.6,"M":99.0,"vol":21.5,"div":0.2,"dd":-52.8,"esg":25.3,"mcap":"Mid ($2B-$10B)"},{"ticker":"SDZ","exch":"XSWX","name":"Sandoz Group Ltd","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":42.7,"V":59.7,"G":10.4,"M":15.4,"vol":38.2,"div":3.3,"dd":-15.0,"esg":58.5,"mcap":"Small (<$2B)"},{"ticker":"SGE","exch":"XLON","name":"THE SAGE GROUP PLC.","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Software & IT Services","Q":74.5,"V":28.7,"G":77.9,"M":33.5,"vol":50.5,"div":3.4,"dd":-35.1,"esg":76.2,"mcap":"Mid ($2B-$10B)"},{"ticker":"SHEL","exch":"XNYS","name":"SHELL PLC","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":70.5,"V":58.9,"G":41.2,"M":26.8,"vol":49.1,"div":0,"dd":-47.2,"esg":26.9,"mcap":"Large ($10B-$200B)"},{"ticker":"SHW","exch":"XNYS","name":"THE SHERWIN-WILLIAMS COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Materials & Chemicals","Q":67.5,"V":67.5,"G":21.9,"M":35.7,"vol":21.4,"div":0,"dd":-60.6,"esg":26.4,"mcap":"Large ($10B-$200B)"},{"ticker":"SIE","exch":"XFRA","name":"Siemens AG","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":42.5,"V":20.7,"G":64.0,"M":7.5,"vol":28.5,"div":3.3,"dd":-22.2,"esg":71.2,"mcap":"Mega (>$200B)"},{"ticker":"SIKAN","exch":"XMEX","name":"Sika Ltd","country":"Japan","region":"Asia-Pacific","devtype":"DM","sector":"Materials & Chemicals","Q":22.1,"V":91.8,"G":49.4,"M":52.9,"vol":16.9,"div":1.5,"dd":-50.3,"esg":57.8,"mcap":"Large ($10B-$200B)"},{"ticker":"SKFB","exch":"XFRA","name":"SKF Inc","country":"Germany","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":84.5,"V":34.3,"G":71.9,"M":41.9,"vol":19.2,"div":4.2,"dd":-24.8,"esg":70.4,"mcap":"Mega (>$200B)"},{"ticker":"SMCI","exch":"XNAS","name":"SUPER MICRO COMPUTER, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":90.0,"V":27.1,"G":90.1,"M":33.3,"vol":45.4,"div":0.4,"dd":-61.3,"esg":91.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"SMIN","exch":"XLON","name":"SMITHS GROUP PLC","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":31.1,"V":31.8,"G":12.0,"M":76.6,"vol":37.4,"div":4.7,"dd":-51.5,"esg":50.0,"mcap":"Mega (>$200B)"},{"ticker":"SNA","exch":"XNYS","name":"SNAP-ON INCORPORATED","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":60.0,"V":39.3,"G":79.9,"M":8.4,"vol":37.9,"div":1.4,"dd":-33.9,"esg":76.8,"mcap":"Mid ($2B-$10B)"},{"ticker":"SNDK","exch":"XNAS","name":"SANDISK CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":84.5,"V":27.4,"G":88.3,"M":95.8,"vol":35.8,"div":4.2,"dd":-20.5,"esg":54.7,"mcap":"Small (<$2B)"},{"ticker":"SOBI","exch":"XSTO","name":"Swedish Orphan Biovitrum AB (publ)","country":"Sweden","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":92.6,"V":34.5,"G":94.4,"M":62.6,"vol":30.6,"div":4.7,"dd":-62.6,"esg":31.3,"mcap":"Mega (>$200B)"},{"ticker":"SOLV","exch":"XNYS","name":"SOLVENTUM CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":58.0,"V":24.8,"G":86.4,"M":15.7,"vol":47.0,"div":0.5,"dd":-51.1,"esg":79.4,"mcap":"Large ($10B-$200B)"},{"ticker":"SOON","exch":"XSWX","name":"Sonova Holding Ltd.","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":51.5,"V":23.0,"G":42.1,"M":5.9,"vol":31.6,"div":4.3,"dd":-13.6,"esg":63.3,"mcap":"Mid ($2B-$10B)"},{"ticker":"SPIE","exch":"XPAR","name":"Spie SA","country":"France","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":34.7,"V":58.9,"G":81.1,"M":82.3,"vol":35.9,"div":1.8,"dd":-56.3,"esg":33.5,"mcap":"Small (<$2B)"},{"ticker":"SPX","exch":"XFRA","name":"SPACE EXPLORATION TECHNOLOGIES CORP.","country":"Germany","region":"Europe","devtype":"DM","sector":"Aerospace & Defense","Q":70.0,"V":92.8,"G":19.2,"M":10.0,"vol":24.0,"div":3.3,"dd":-60.2,"esg":55.6,"mcap":"Large ($10B-$200B)"},{"ticker":"STE","exch":"XNYS","name":"STERIS PUBLIC LIMITED COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":45.0,"V":31.1,"G":40.6,"M":60.0,"vol":35.7,"div":0,"dd":-19.5,"esg":68.1,"mcap":"Small (<$2B)"},{"ticker":"STLD","exch":"XNAS","name":"STEEL DYNAMICS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":27.0,"V":73.3,"G":59.5,"M":25.2,"vol":36.3,"div":2.2,"dd":-15.9,"esg":63.0,"mcap":"Small (<$2B)"},{"ticker":"STMMI","exch":"XMIL","name":"STMicroelectronics NV","country":"Italy","region":"Europe","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":65.8,"V":68.7,"G":37.4,"M":70.1,"vol":21.7,"div":0,"dd":-16.3,"esg":64.7,"mcap":"Mega (>$200B)"},{"ticker":"STMN","exch":"XWBO","name":"Straumann Holding Ltd","country":"Austria","region":"Europe","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":78.6,"V":96.2,"G":13.6,"M":90.1,"vol":53.4,"div":0,"dd":-31.0,"esg":28.1,"mcap":"Small (<$2B)"},{"ticker":"STX","exch":"XNAS","name":"SEAGATE TECHNOLOGY HOLDINGS PUBLIC LIMITED COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":54.2,"V":41.8,"G":15.1,"M":19.5,"vol":39.6,"div":0.8,"dd":-49.6,"esg":40.0,"mcap":"Small (<$2B)"},{"ticker":"SYK","exch":"XNYS","name":"STRYKER CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":37.7,"V":71.4,"G":77.9,"M":30.6,"vol":15.0,"div":4.2,"dd":-23.9,"esg":84.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"SYY","exch":"XNYS","name":"SYSCO CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Staples","Q":68.7,"V":95.9,"G":39.2,"M":22.4,"vol":45.7,"div":0,"dd":-53.7,"esg":73.2,"mcap":"Large ($10B-$200B)"},{"ticker":"TDG","exch":"XNYS","name":"TRANSDIGM GROUP INCORPORATED","country":"United States","region":"North America","devtype":"DM","sector":"Aerospace & Defense","Q":57.8,"V":74.5,"G":30.5,"M":75.9,"vol":28.6,"div":3.8,"dd":-26.8,"esg":81.4,"mcap":"Small (<$2B)"},{"ticker":"TDY","exch":"XNYS","name":"TELEDYNE TECHNOLOGIES INCORPORATED","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":81.8,"V":23.3,"G":37.6,"M":70.7,"vol":54.3,"div":5.5,"dd":-30.8,"esg":76.6,"mcap":"Large ($10B-$200B)"},{"ticker":"TECH","exch":"XNAS","name":"BIO-TECHNE CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":76.5,"V":71.6,"G":59.1,"M":55.2,"vol":52.1,"div":2.9,"dd":-9.2,"esg":80.4,"mcap":"Large ($10B-$200B)"},{"ticker":"TEL","exch":"XNYS","name":"TE CONNECTIVITY PUBLIC LIMITED COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":82.4,"V":86.9,"G":52.0,"M":63.1,"vol":16.4,"div":0,"dd":-28.8,"esg":44.0,"mcap":"Large ($10B-$200B)"},{"ticker":"1TER","exch":"XMIL","name":"TERADYNE, INC.","country":"Italy","region":"Europe","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":28.7,"V":79.3,"G":59.1,"M":47.2,"vol":44.6,"div":0,"dd":-48.1,"esg":32.0,"mcap":"Mega (>$200B)"},{"ticker":"TGT","exch":"XNYS","name":"TARGET CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":31.2,"V":82.1,"G":10.2,"M":24.2,"vol":35.7,"div":2.7,"dd":-26.4,"esg":35.6,"mcap":"Mega (>$200B)"},{"ticker":"TJX","exch":"XNYS","name":"THE TJX COMPANIES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":63.0,"V":73.3,"G":58.4,"M":30.5,"vol":38.9,"div":2.3,"dd":-32.7,"esg":86.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"TMO","exch":"XNYS","name":"THERMO FISHER SCIENTIFIC INCORPORATED","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":73.3,"V":75.5,"G":91.1,"M":27.6,"vol":25.6,"div":4.5,"dd":-61.1,"esg":41.7,"mcap":"Mid ($2B-$10B)"},{"ticker":"TMUS","exch":"XNAS","name":"T-MOBILE US, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Telecom & Communication Services","Q":80.2,"V":59.1,"G":69.0,"M":98.0,"vol":12.5,"div":4.7,"dd":-59.2,"esg":50.3,"mcap":"Mega (>$200B)"},{"ticker":"TPL","exch":"XNYS","name":"TEXAS PACIFIC LAND CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":93.5,"V":73.8,"G":41.3,"M":59.3,"vol":18.5,"div":3.9,"dd":-12.3,"esg":63.8,"mcap":"Mid ($2B-$10B)"},{"ticker":"TPR","exch":"XNYS","name":"TAPESTRY, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":87.0,"V":49.1,"G":88.3,"M":70.3,"vol":32.0,"div":5.0,"dd":-43.8,"esg":71.2,"mcap":"Large ($10B-$200B)"},{"ticker":"TPRO","exch":"XMIL","name":"Technoprobe SpA","country":"Italy","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":39.1,"V":32.2,"G":70.8,"M":39.7,"vol":32.6,"div":1.7,"dd":-47.8,"esg":94.8,"mcap":"Mid ($2B-$10B)"},{"ticker":"TRGP","exch":"XNYS","name":"TARGA RESOURCES CORP.","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":60.7,"V":30.8,"G":67.0,"M":67.9,"vol":20.4,"div":1.4,"dd":-28.2,"esg":89.0,"mcap":"Mega (>$200B)"},{"ticker":"TROW","exch":"XNAS","name":"T. ROWE PRICE GROUP, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":96.1,"V":81.2,"G":46.8,"M":96.7,"vol":21.5,"div":3.4,"dd":-31.8,"esg":46.4,"mcap":"Mega (>$200B)"},{"ticker":"TSCO","exch":"XNAS","name":"TRACTOR SUPPLY COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":72.0,"V":33.0,"G":43.8,"M":31.2,"vol":29.9,"div":1.2,"dd":-9.7,"esg":87.3,"mcap":"Mid ($2B-$10B)"},{"ticker":"TSM","exch":"XNYS","name":"Taiwan Semiconductor Manufacturing Company Limited","country":"Taiwan","region":"Asia-Pacific","devtype":"EM","sector":"Semiconductors & Tech Hardware","Q":77.6,"V":53.0,"G":93.3,"M":93.6,"vol":48.0,"div":0.9,"dd":-14.8,"esg":65.7,"mcap":"Large ($10B-$200B)"},{"ticker":"TT","exch":"XNYS","name":"TRANE TECHNOLOGIES PUBLIC LIMITED COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":63.4,"V":74.1,"G":54.5,"M":50.3,"vol":13.6,"div":0,"dd":-10.4,"esg":76.1,"mcap":"Mega (>$200B)"},{"ticker":"TTD","exch":"XNAS","name":"THE TRADE DESK, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":89.2,"V":23.9,"G":81.4,"M":96.8,"vol":26.8,"div":0,"dd":-60.2,"esg":63.7,"mcap":"Mid ($2B-$10B)"},{"ticker":"TTE","exch":"XNYS","name":"TotalEnergies SE","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":53.0,"V":61.5,"G":60.5,"M":30.9,"vol":19.2,"div":4.2,"dd":-36.9,"esg":82.5,"mcap":"Large ($10B-$200B)"},{"ticker":"TXN","exch":"XNAS","name":"TEXAS INSTRUMENTS INCORPORATED","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":54.6,"V":51.4,"G":71.6,"M":44.7,"vol":52.8,"div":2.1,"dd":-15.9,"esg":51.4,"mcap":"Large ($10B-$200B)"},{"ticker":"TXT","exch":"XMIL","name":"TXT e solutions SpA","country":"Italy","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":36.1,"V":74.1,"G":56.7,"M":20.4,"vol":31.3,"div":0.2,"dd":-10.2,"esg":66.1,"mcap":"Large ($10B-$200B)"},{"ticker":"TYL","exch":"XNYS","name":"TYLER TECHNOLOGIES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":96.6,"V":69.7,"G":59.6,"M":43.2,"vol":30.7,"div":3.3,"dd":-25.3,"esg":41.9,"mcap":"Large ($10B-$200B)"},{"ticker":"UBER","exch":"XNYS","name":"UBER TECHNOLOGIES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Internet, Media & Entertainment","Q":91.9,"V":92.0,"G":26.7,"M":77.3,"vol":16.3,"div":4.1,"dd":-10.5,"esg":32.5,"mcap":"Large ($10B-$200B)"},{"ticker":"UCB","exch":"XNYS","name":"UNITED COMMUNITY BANKS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":42.2,"V":88.7,"G":45.3,"M":32.8,"vol":24.5,"div":0,"dd":-48.0,"esg":35.9,"mcap":"Small (<$2B)"},{"ticker":"UHR","exch":"XSWX","name":"The Swatch Group Ltd","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":93.9,"V":35.0,"G":50.0,"M":6.9,"vol":51.3,"div":0.8,"dd":-27.3,"esg":77.4,"mcap":"Large ($10B-$200B)"},{"ticker":"UHS","exch":"XNYS","name":"UNIVERSAL HEALTH SERVICES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":78.8,"V":39.1,"G":42.6,"M":35.2,"vol":34.8,"div":0,"dd":-24.9,"esg":71.2,"mcap":"Mega (>$200B)"},{"ticker":"ULTA","exch":"XNAS","name":"ULTA BEAUTY, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":77.0,"V":71.1,"G":54.5,"M":82.6,"vol":29.7,"div":0.8,"dd":-10.7,"esg":38.6,"mcap":"Large ($10B-$200B)"},{"ticker":"ULVR","exch":"XLON","name":"UNILEVER PLC","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Consumer Staples","Q":95.8,"V":89.2,"G":80.5,"M":70.5,"vol":49.1,"div":1.1,"dd":-12.3,"esg":82.3,"mcap":"Large ($10B-$200B)"},{"ticker":"UMG","exch":"XAMS","name":"Universal Music Group NV","country":"Netherlands","region":"Europe","devtype":"DM","sector":"Internet, Media & Entertainment","Q":65.4,"V":68.7,"G":90.3,"M":47.8,"vol":15.6,"div":2.2,"dd":-52.2,"esg":26.3,"mcap":"Small (<$2B)"},{"ticker":"UNH","exch":"XNYS","name":"UNITEDHEALTH GROUP INCORPORATED","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":93.4,"V":44.5,"G":86.7,"M":32.8,"vol":21.0,"div":2.7,"dd":-44.8,"esg":67.7,"mcap":"Mega (>$200B)"},{"ticker":"UNP","exch":"XNYS","name":"UNION PACIFIC CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":22.3,"V":40.3,"G":17.5,"M":41.8,"vol":50.6,"div":3.4,"dd":-32.2,"esg":79.0,"mcap":"Large ($10B-$200B)"},{"ticker":"URI","exch":"XNYS","name":"UNITED RENTALS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":46.9,"V":36.2,"G":87.1,"M":86.3,"vol":51.9,"div":4.0,"dd":-43.9,"esg":49.6,"mcap":"Mid ($2B-$10B)"},{"ticker":"V","exch":"XNYS","name":"VISA INC.","country":"United States","region":"North America","devtype":"DM","sector":"Financials","Q":60.9,"V":27.0,"G":78.3,"M":49.2,"vol":34.4,"div":0.9,"dd":-34.6,"esg":28.8,"mcap":"Mega (>$200B)"},{"ticker":"VACN","exch":"XSWX","name":"VAT Group Ltd","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":48.2,"V":68.8,"G":31.4,"M":13.2,"vol":26.5,"div":0,"dd":-39.5,"esg":37.8,"mcap":"Small (<$2B)"},{"ticker":"VEEV","exch":"XNYS","name":"VEEVA SYSTEMS INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":51.2,"V":28.7,"G":22.2,"M":46.2,"vol":21.6,"div":0,"dd":-27.8,"esg":53.3,"mcap":"Mid ($2B-$10B)"},{"ticker":"VLO","exch":"XNYS","name":"VALERO ENERGY CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":67.8,"V":86.0,"G":36.5,"M":98.6,"vol":40.5,"div":0,"dd":-12.9,"esg":29.8,"mcap":"Large ($10B-$200B)"},{"ticker":"VLTO","exch":"XNYS","name":"VERALTO CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":44.5,"V":85.7,"G":90.2,"M":50.8,"vol":39.5,"div":3.2,"dd":-31.7,"esg":60.6,"mcap":"Mid ($2B-$10B)"},{"ticker":"VMC","exch":"XNYS","name":"VULCAN MATERIALS COMPANY","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":55.6,"V":44.2,"G":64.1,"M":12.1,"vol":47.5,"div":4.0,"dd":-19.8,"esg":74.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"VOE","exch":"XWBO","name":"voestalpine AG","country":"Austria","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":82.5,"V":63.6,"G":40.9,"M":90.4,"vol":47.8,"div":0.2,"dd":-35.3,"esg":30.6,"mcap":"Mega (>$200B)"},{"ticker":"VOLV","exch":"XWAR","name":"Volvo AB","country":"Poland","region":"Europe","devtype":"EM","sector":"Automobiles & Components","Q":83.9,"V":41.0,"G":30.0,"M":54.1,"vol":27.8,"div":0.1,"dd":-24.5,"esg":34.9,"mcap":"Mega (>$200B)"},{"ticker":"VRSK","exch":"XNAS","name":"VERISK ANALYTICS, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":51.6,"V":49.4,"G":55.4,"M":15.8,"vol":51.5,"div":3.1,"dd":-26.5,"esg":87.4,"mcap":"Mid ($2B-$10B)"},{"ticker":"VRT","exch":"XNYS","name":"VERTIV HOLDINGS CO","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":39.0,"V":59.8,"G":31.6,"M":47.3,"vol":13.0,"div":1.7,"dd":-30.3,"esg":28.3,"mcap":"Mid ($2B-$10B)"},{"ticker":"VRTX","exch":"XNAS","name":"VERTEX PHARMACEUTICALS INCORPORATED","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":35.7,"V":47.3,"G":53.3,"M":39.8,"vol":42.0,"div":0,"dd":-39.9,"esg":84.4,"mcap":"Mega (>$200B)"},{"ticker":"VWS","exch":"XCSE","name":"Vestas Wind Systems A/S","country":"Denmark","region":"Europe","devtype":"DM","sector":"Energy","Q":31.2,"V":46.2,"G":81.6,"M":37.9,"vol":13.4,"div":2.5,"dd":-27.8,"esg":91.6,"mcap":"Small (<$2B)"},{"ticker":"WDC","exch":"XNAS","name":"WESTERN DIGITAL CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Semiconductors & Tech Hardware","Q":52.2,"V":68.9,"G":67.8,"M":54.5,"vol":19.0,"div":3.1,"dd":-34.4,"esg":80.2,"mcap":"Small (<$2B)"},{"ticker":"WEIR","exch":"XLON","name":"WEIR GROUP PLC(THE)","country":"United Kingdom","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":58.9,"V":72.6,"G":23.5,"M":16.5,"vol":32.7,"div":1.5,"dd":-9.1,"esg":37.8,"mcap":"Small (<$2B)"},{"ticker":"WKL","exch":"XSWX","name":"Wolters Kluwer N.V.","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Software & IT Services","Q":43.0,"V":90.2,"G":20.0,"M":46.0,"vol":44.4,"div":4.6,"dd":-41.4,"esg":30.3,"mcap":"Mega (>$200B)"},{"ticker":"WM","exch":"XSWX","name":"WASTE MANAGEMENT, INC.","country":"Switzerland","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":88.4,"V":57.7,"G":78.5,"M":16.7,"vol":18.3,"div":5.1,"dd":-24.9,"esg":56.8,"mcap":"Large ($10B-$200B)"},{"ticker":"WMT","exch":"XNAS","name":"WALMART INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Staples","Q":79.1,"V":40.8,"G":69.8,"M":53.2,"vol":43.6,"div":0.4,"dd":-44.8,"esg":51.9,"mcap":"Small (<$2B)"},{"ticker":"WRT1V","exch":"XHEL","name":"Wartsila Oyj Abp","country":"Finland","region":"Europe","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":82.8,"V":91.8,"G":57.7,"M":40.3,"vol":20.6,"div":2.8,"dd":-48.1,"esg":50.6,"mcap":"Mega (>$200B)"},{"ticker":"WSM","exch":"XNYS","name":"WILLIAMS-SONOMA, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":54.0,"V":56.6,"G":81.5,"M":54.1,"vol":28.6,"div":5.1,"dd":-22.2,"esg":39.2,"mcap":"Mega (>$200B)"},{"ticker":"WST","exch":"XNYS","name":"WEST PHARMACEUTICAL SERVICES, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":31.2,"V":45.7,"G":38.4,"M":13.4,"vol":40.4,"div":4.1,"dd":-41.1,"esg":60.0,"mcap":"Mid ($2B-$10B)"},{"ticker":"XOM","exch":"XNYS","name":"EXXONMOBIL HOLDINGS CORPORATION","country":"United States","region":"North America","devtype":"DM","sector":"Energy","Q":53.1,"V":73.3,"G":49.8,"M":78.8,"vol":51.6,"div":4.9,"dd":-37.8,"esg":65.9,"mcap":"Mega (>$200B)"},{"ticker":"XYL","exch":"XNYS","name":"XYLEM INC.","country":"United States","region":"North America","devtype":"DM","sector":"Capital Goods & Industrial Machinery","Q":59.7,"V":38.4,"G":94.1,"M":32.6,"vol":28.1,"div":2.5,"dd":-32.1,"esg":30.7,"mcap":"Mid ($2B-$10B)"},{"ticker":"XYZ","exch":"XNYS","name":"BLOCK, INC.","country":"United States","region":"North America","devtype":"DM","sector":"Software & IT Services","Q":29.9,"V":72.1,"G":57.7,"M":84.9,"vol":17.9,"div":0.3,"dd":-10.0,"esg":76.1,"mcap":"Mid ($2B-$10B)"},{"ticker":"YAR","exch":"XOSL","name":"Yara International ASA","country":"Norway","region":"Europe","devtype":"DM","sector":"Consumer Staples","Q":82.8,"V":86.0,"G":25.8,"M":34.3,"vol":33.0,"div":3.7,"dd":-25.8,"esg":76.7,"mcap":"Small (<$2B)"},{"ticker":"YUM","exch":"XNYS","name":"YUM! Brands, Inc.","country":"United States","region":"North America","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":50.6,"V":84.9,"G":81.9,"M":52.6,"vol":40.6,"div":1.6,"dd":-39.0,"esg":64.2,"mcap":"Small (<$2B)"},{"ticker":"ZAB","exch":"XWAR","name":"Zabka Group SA","country":"Poland","region":"Europe","devtype":"EM","sector":"Consumer Staples","Q":61.1,"V":72.9,"G":62.2,"M":89.7,"vol":26.0,"div":0,"dd":-32.2,"esg":49.2,"mcap":"Large ($10B-$200B)"},{"ticker":"ZAL","exch":"XFRA","name":"Zalando SE","country":"Germany","region":"Europe","devtype":"DM","sector":"Consumer Discretionary & Retail","Q":47.2,"V":57.1,"G":87.6,"M":78.0,"vol":31.9,"div":3.4,"dd":-25.4,"esg":43.9,"mcap":"Mid ($2B-$10B)"},{"ticker":"ZTS","exch":"XNYS","name":"ZOETIS INC.","country":"United States","region":"North America","devtype":"DM","sector":"Healthcare & Pharmaceuticals","Q":91.1,"V":87.1,"G":65.3,"M":56.7,"vol":33.1,"div":0,"dd":-45.9,"esg":33.1,"mcap":"Large ($10B-$200B)"}];

const PRICE_HISTORY_DATES = ["2021-06-01","2021-09-01","2021-12-01","2022-03-01","2022-06-01","2022-09-01","2022-12-01","2023-03-01","2023-06-01","2023-09-01","2023-12-01","2024-03-01","2024-06-01","2024-09-01","2024-12-01","2025-03-01","2025-06-01","2025-09-01","2025-12-01","2026-03-01","2026-06-01"];
const PRICE_HISTORY = {"OBYSY":[12.97,12.97,12.97,12.97,12.97,12.97,12.97,12.97,12.97,12.97,12.97,12.97,12.97,12.97,12.97,12.1,12.5,13.1,16,21.6,16.3],"KIK":[10.3,12.5,13,12.9,9.72,11.9,10.8,8.8,11.1,10.6,11.1,12.3,10.7,10,10.2,9.25,7.9,7.2,7.7,7.75,7.67],"AJINF":[9.25,12.5,13,12.8,11.1,13.7,15.7,14.9,18.2,19.2,16.9,16.9,16.35,16.67,19.77,19.23,21.97,22.97,19.4,26.6,27.37],"KXIAY":[10.64,10.64,10.64,10.64,10.64,10.64,10.64,10.64,10.64,10.64,10.64,10.64,10.64,10.64,10.64,10.64,10.64,10.64,10.64,10.64,37.6],"JAPAF":[2167,2154.5,2266.5,2145,2367.5,2372,2810.5,2756,3061,3202,3851,3879,4533,4190,4221,3811,4411,4683,5865,5982,6167],"NEXOY":[23.7,19,19.23,22.48,24.76,19.46,21.67,21.51,20.93,20.25,21.57,17.09,16.92,20.13,14.08,13.31,18.15,22.48,24.49,20.6,13.96],"IBI":[19,22.2,26.5,21.4,16.1,14.8,19.6,16.2,24.3,27,21.5,21,17.9,15.5,13.6,13.6,18.4,20.1,31,51,130],"SEH0":[13.2,13.2,13.2,13.2,13.2,13.2,13.2,13.2,13.2,13.2,15.4,19.3,16.7,19.1,17.1,14.1,13.7,12.7,12.3,16,20.4],"NURAF":[32.1,32.1,32.1,37.25,37.25,26.91,23.55,24.68,25.67,28.7,28.1,28.2,26.8,33.9,32.48,34.31,42.35,38.41,40.2,27.3,31.78],"4507N":[13.4,18.17,20.17,20,16.27,15.87,16.13,13.53,13.67,13.4,14.27,15.27,13.67,13.33,12.9,13.7,14.2,14.2,13.9,19.1,15.42],"4519N":[18.72,19.89,16.02,16.52,13.45,12.68,13.37,12.1,13.73,15.1,17.69,20.42,15.29,23.88,22.01,25.29,27.16,21.79,25.94,32.17,24.68],"TUO0":[29.8,29.8,29.8,29.8,29.8,29.8,29.8,29.8,29.8,29.8,29.8,29.8,15.2,15.8,18.8,16.8,15.3,14.8,12.9,10.4,12.5],"D4S":[18.58,19.85,21.71,21.43,23.85,29.51,31.8,28.76,31.6,27.58,25.06,30.3,31.42,36.7,31.49,23.4,23.33,20.34,20.85,15.8,14.77],"OSUKF":[21.1,21.4,20,16.9,14.5,15.4,15.5,15.5,17.6,19.9,18.2,19.7,17.1,21,23.6,20.8,17.9,17.2,16.7,16.4,15.3],"YORUY":[16.2,14.1,13.4,12.1,12.3,16,15.4,17.4,19.2,18.6,20.4,24.2,23,20.8,19.1,21.6,21.8,31.6,34.6,40,38.6],"BGT":[17.82,19.22,17.65,18.19,18.49,18.62,17.97,17.84,18.45,17.81,18.74,19.64,19.92,17.3,16.91,18.82,18.43,19.31,19.84,19.63,18.47],"FKA":[2.14,1.78,1.74,1.76,1.58,1.7,1.77,1.63,1.55,1.58,1.5,1.77,2.42,2.22,4.12,3.98,4.18,5.05,5.3,15.9,27.73],"SMO1":[3.17,2.83,2.9,2.92,2.67,2.85,2.78,2.88,2.7,2.75,2.78,3.33,3.67,3.7,4.63,4.05,4.53,5.85,8.65,14.5,16.57],"FJK0":[4.72,4.72,4.72,4.72,4.72,4.72,4.72,4.72,4.72,4.72,4.72,4.72,4.72,4.72,4.72,4.72,4.72,6.91,8.97,14.96,14.82],"1RHA":[12.1,12.1,10.79,7.74,6.55,6.15,5.9,4.84,5.6,6.5,6.45,7.5,9,10.3,12.4,11,9.3,8.9,8.25,6.65,10.9],"DISPF":[29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,29,26.4,37.6,33.2],"SMGBF":[2.26,2.27,2.26,2.18,1.97,1.82,1.7,1.88,1.85,1.82,1.9,1.84,1.76,1.45,1.62,1.5,1.45,1.12,1.32,1.3,1.12],"KOM1":[24.38,21.26,20.15,20.81,23.8,20.54,21.81,22.77,21.84,26.44,23.3,26.71,27.76,24.41,25.61,28.11,26.17,28.78,28.23,40.13,34.94],"EAR":[7.96,8.6,9.24,9.6,7.88,7.36,7.36,8,8.32,9.08,10.3,15.7,13.9,11.59,14.03,16.09,13.75,17.18,21.14,29.7,29.88],"DKIA":[15.9,20.2,18,16,14.6,16.8,15.3,16.5,17.3,16.5,13.2,12.5,13.1,11.4,11.7,10.1,9.75,10.5,10.9,10.6,12.4],"MIELY":[30.75,27.45,24.94,24.09,22.08,19.85,20.04,22.72,26.73,25.88,28.03,32.36,35,32.55,34.22,31.1,41.01,47.39,54.51,75.05,81.81],"FJE":[37.8,35.8,45.2,45.4,43.6,41,39.8,36.6,38.8,43.4,37.8,56,55,54,54.5,42,38.6,54,57.5,73,82.22],"YEC0":[75.62,80.14,77.83,70.37,62,61.5,61,74,75,70,65.5,74,71,58,47.6,49.4,38,33.4,42.8,55.5,76.5],"NEC":[2.99,2.74,2.87,2.8,2.2,2.19,2.17,1.89,1.9,2.08,1.9,1.68,1.44,1.34,1.27,1.64,1.62,1.75,1.09,1.03,0.95],"FUJ1":[13.08,15.32,15.07,12.92,13.83,11.36,12.86,11.9,12.4,11.44,13.34,14.4,13.15,16.7,17.81,18.77,21.64,20.06,22.84,18.81,18.49],"RNECN":[7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,7.7,8.35,7.7,6.25,7.65,5.1,4.76,4.76,7.4,11.4],"MAT":[7.96,7.96,7.96,7.96,7.96,7.96,7.96,7.96,7.96,7.96,7.96,7.96,7.85,7.3,8.7,11.6,9.45,8.4,9.9,13.2,18.7],"SON1":[2166,2288,2779,2355,2474,2200,2265,2287,2682,2507,2544,2643,2617,2817,3014,3713,3802,4021,4414,3593,3444],"TDK":[6.94,5.86,6.94,7.04,6.48,6.8,7.14,6.37,7.2,6.6,8.4,9.72,9.49,12.37,12.57,10.19,9.34,11.02,13.63,12.49,22.6],"6857N":[18.13,18,19.5,17.5,16.13,13.63,16.38,18.88,30,28.5,28.2,43.4,30.4,41,52,51,42.6,61.5,108,137,139],"KEE":[403.9,514.6,545,430,369.7,369,404.3,411.5,462.3,381.8,388.8,434.4,416.3,428.2,409.9,390.1,362.4,326.3,289.6,342.4,433.3],"DNZOF":[13.8,14.4,15.8,15.4,14,13.4,13,12.4,14.1,15.5,15,16.4,14.7,13.4,13.3,12.2,12.2,12.8,11.1,11.7,10.1],"LSRCF":[168,168,168,168,168,168,168,168,168,168,168,168,168,168,168,168,168,168,168,182,210],"FUCA":[19.5,17.9,17.8,16.2,15.2,15.9,14.2,16.1,15.8,13,12.5,13.5,12.6,12.9,11.9,13.6,11.2,11.5,13.6,19.1,21.6],"TYC1":[39.4,47.6,48.85,39.6,38.69,30.31,30.17,28.45,28.8,25.6,22.6,20.6,19.8,22,13.5,15.4,14.2,17.2,18.4,26.2,82],"6981N":[2816.33,3145.67,2809,2593.33,2787.67,2456.33,2527.33,2459,2740.67,2718.67,2847.5,3029,3058,3103,2494.5,2568.5,2068.5,2418,3224,4065,9625],"NDEKF":[16.58,15.27,14.98,14.11,14.31,13.44,10.45,12.04,13.98,13.34,13.34,14.95,15.19,14.84,16.3,20.25,18.3,22.78,23.35,23.54,19.75],"MHVYF":[3.15,2.71,2.28,3.1,3.98,3.56,4,3.65,4.28,5.66,5.7,7.93,8.86,12.7,15.05,14,23.8,25.5,25.05,33.38,23.79],"IWJ":[2.94,2.64,2.39,3.14,3.94,3.71,3.66,3.4,3.03,3.26,2.47,2.94,3.29,5.77,7.09,8.57,12.64,12.5,15.2,23.8,14.97],"SUK0":[41,41,41,41,41,41,41,41,41,41,41,41,43,39.8,39.6,46,43,44.8,53,47.8,41.8],"3RKU":[3.85,4.47,3.47,3.13,2.38,2.17,2.44,2.21,2.2,2.9,3.47,3.58,3.63,4.07,4.82,6.3,8.3,4.5,8.1,9.05,9.45],"PARR":[14.68,15.77,13.04,12.19,17.19,18.2,22.78,29.4,21.48,35.66,34.75,35.95,25.84,21.68,17.66,13.21,21.99,35.39,47.2,46.08,56.16],"OLY1":[17.49,17.6,19.5,17.9,19.47,21.06,20.16,15.92,14.7,12.53,13.48,13.18,14.53,15.96,15.08,13.14,11.14,10.34,11.36,8.05,9.62],"DAO":[19.88,18.13,22.25,21.63,21.5,16.13,16.25,19.13,24.63,23.13,33.5,61.5,44.05,32.34,30.48,34.35,30.26,31.62,36.86,59.7,60.36],"HYB":[105.45,138.1,142.9,114.05,98.32,100.3,99.42,90.52,120.8,101.6,101.1,123.05,112.15,126.4,124.7,115.65,102.75,111,125.45,151.5,148],"N9B":[19.25,20.17,23.57,22.9,22.99,24.08,20.89,19.11,21.95,21.29,17.93,18.08,17.2,18.78,19.92,33.11,27.83,29.13,24.16,22.08,19.52],"NTDOF":[61.07,48.95,44.45,50.4,44.97,40.59,42.6,38.02,43.04,42.95,47.18,56.14,54.96,53.4,59.01,74.44,82.36,89.91,86.23,56.24,44.25],"9TO":[12.07,12.13,12.6,12.07,11.93,11.13,12.07,12.73,13.6,18.5,16.83,19.83,18.5,17,16.5,16.2,18.6,22.6,28,37.2,37.87],"MTS1":[9.06,9.33,10.09,10.98,11.76,11.3,14.03,13.59,15.32,17.27,16.67,20.76,23.39,18.97,19.76,18.44,18.16,19.68,22.72,32.78,28.28],"TOELF":[146.57,143.87,179.45,164,150.26,100.87,114.28,116.18,142.22,149.94,160.3,262.95,222.67,163.5,162.02,143.56,164.39,138.59,197.95,272.46,339.71],"MBI":[7.34,8.5,8.77,10.19,10.61,10.53,10.52,10.87,13.09,15.33,14.15,19.7,19.46,18.19,16.52,16.17,17.73,19.45,20.25,29,27.19],"OSKU":[9.3,9.85,8.95,8.3,7.05,7.05,6.65,6.6,7.3,7.8,8.9,11.9,10.5,10.2,11.1,9.8,9.25,8.5,9.45,11.1,9.95],"L3W":[18.5,18.5,18.5,18.5,18.5,18.5,18.5,18.5,18.5,18.5,18.5,18.5,18.5,18.5,18.5,18.5,18.5,18.5,18.5,18.5,27],"9433N":[1831.5,1692.5,1644,1891.5,2268,2128.5,2041,1994,2172,2175.5,2293.5,2276.5,2178,2460,2478.5,2468.5,2455.5,2583,2650,2663,2738.5],"9766N":[6930,6930,5950,6750,8790,7250,6420,6040,7510,8473,7297,10255,10985,13280,14960,18705,19885,21905,23090,20495,18930],"9983N":[29633.33,24450,22360,21096.67,20536.67,26920,27593.33,26600,32730,33330,37100,44370,40930,46820,50430,46970,47800,46210,55950,67750,82330],"A":[137.2,175.45,148.21,131.93,123.09,128.93,156.12,137.51,116.26,121.91,128.79,139.06,131.4,138.96,139.58,126.33,111.05,125.21,150.1,118.17,135.53],"AAFN":[79.1,93.7,126.1,142.3,153.9,131.3,123.5,120.4,121.3,115,111.5,97.15,124.5,116.5,104.9,143.3,177.8,223,312,360.2,352.6],"AAPL":[124.28,152.51,164.77,163.2,148.71,157.96,148.31,145.31,180.09,189.46,191.24,179.66,194.03,222.77,239.59,238.03,201.7,229.72,283.1,264.72,312.06],"ABBN":[29.79,32.62,30.97,29.35,28.37,25.4,29.54,31.47,33.52,33.31,35.18,40.74,49.79,48.97,51.02,48.74,46.12,53.74,57.22,70.64,83.62],"ABBV":[112.21,112.27,115.91,147.69,146.02,138.45,161.63,155.27,133.44,148.2,143.41,178.91,160.19,197.69,181.77,211.48,186.99,211.92,225.11,234.26,217.72],"ABI":[62.38,52.44,49.76,52.72,51.5,47.95,56.89,56.62,50.32,51.96,58.25,55.78,57.76,55.2,51.1,58.4,61.94,53.4,53.7,67.28,69],"ACN":[280.88,337.9,360.14,311.35,298.65,288.79,302.83,263.59,305.2,327.74,338.06,380.99,281.76,341.88,361.38,344.99,314.47,256.17,257.43,205.93,187.07],"ACS":[25.26,22.68,21.6,21.49,26.25,21.83,26.72,28.35,30.92,32.06,36.33,38.25,41.42,41.06,43.66,52.45,57.65,64.65,79.75,107.9,125.5],"ADI":[163.69,161.11,180.84,156.95,164.77,150.69,171.48,183.11,180.41,182.43,183.07,196.16,232.21,218.71,223.12,228.53,215.45,248.32,266.51,352.41,413.85],"ADBE":[495.91,665.89,657.41,466.68,418.16,370.53,344.11,323.38,426.75,563.21,612.47,570.93,439.02,571.04,516.2,440.72,403.4,345.63,322.85,260.88,259.21],"ADDT B":[137,179,210,154,159.8,145.4,155.6,188.7,224,185.3,196.2,231.8,243.2,332.4,308,325,326.2,328.4,325.6,324.8,329.4],"ADP":[196.71,206.86,226.87,202.31,219.32,245.96,267.95,219.56,211.81,255.75,232.94,249.69,244.02,275.55,306.03,318.64,325.8,299.77,255.84,214.97,221.84],"ADS":[298.3,301.25,257.35,203.75,183.86,147.32,125.2,140.26,151.08,184.9,194.06,187.66,232.3,230.1,230.5,247.4,215.1,166.05,161.45,152,167],"ADSK":[281.3,303.24,249.68,214,207.38,201.95,206.93,196.38,203.3,220.02,224.93,264.74,210.82,257.83,296.65,272.03,295.26,319.16,305.12,246.94,231.31],"ADYEN":[1899.2,2683.5,2443.5,1785.2,1447.8,1484,1505.6,1326.2,1550,776.9,1082.8,1470,1184.6,1317.8,1413.4,1747.2,1655.2,1423,1347.4,965.7,939.3],"AIR":[108.68,117.92,101.9,104,108.26,94.86,110.14,122.3,125.92,133.84,138.1,152.64,155.12,136.9,150.56,175.42,162.6,182.04,192.58,180.32,179.62],"AJG":[146.53,144.44,162.33,156.1,160.51,181.6,199.72,187.78,202.13,231.07,248,243.54,253.03,294.49,307.96,341.8,348.77,302.57,246.1,229.27,201.11],"ALE":[9.2,9.2,7.95,8.75,10.19,8.71,9.17,8.93,8.15,7.65,7.85,6.9,8.7,9.45,9.6,9.9,8.25,10.3,11.1,12,11.6],"ALFA":[313.9,358.9,360.2,303.8,260.5,277.5,303.9,348.5,390.8,387.9,391.5,393.6,481.7,462.5,477.4,465.2,402.3,431.1,445.8,534.8,519.4],"ALGN":[593.48,718.72,602.29,500.97,265.17,245.74,201.77,308.53,297.2,374.9,220.45,300.01,254.53,226.5,234.14,175.09,178.51,137.16,146.72,189.02,174.95],"ALLE":[139.36,144.55,122.79,114.63,111.84,95.73,114.06,112.41,104.76,114.75,108.69,126.8,120.5,137,140.4,126.52,139.41,167.99,165.17,162.5,130.07],"PA":[0.24,0.33,0.28,0.14,0.14,0.09,0.1,0.09,0.11,0.14,0.12,0.09,0.19,0.18,0.14,0.09,0.1,0.12,0.13,0.22,0.15],"AMAT":[138.21,133.46,151.67,129.61,114.46,91.81,107.01,117.26,134.83,153.99,151.59,210.25,214.21,183.37,183.27,152.13,157.27,157.57,254.75,372.18,450.06],"AMD":[80.81,109.99,149.11,113.83,101.22,82.33,77.48,78.29,119.47,109.45,121.39,202.64,163.55,136.94,142.06,98.23,114.63,162.32,219.76,198.62,516.1],"AME":[135.77,134.18,135.8,127.39,120.43,120.43,143.29,141.65,146.95,160.65,157.05,180.68,166.21,166.68,195.56,186.55,176.32,184.81,195.61,241.46,225.85],"AMGN":[233.58,223.35,200.8,225.21,253.42,245.5,285.94,236.19,214.27,256.71,272.45,280.33,307.42,330.51,278.1,310.78,288.47,286.92,337.49,385.7,336.79],"AMS":[97.05,101.27,93.4,72.77,62.16,37.11,42.45,39.24,36.29,33.63,16.09,13.22,14.71,10.9,5.84,9.22,7.76,9.76,7.11,8.45,20.14],"AMZN":[160.93,173.95,172.19,151.14,121.68,127.82,95.5,92.17,122.77,138.12,147.03,178.22,178.34,176.25,210.71,205.02,206.65,225.34,233.88,208.39,270.64],"ANDR":[47.44,48.18,42.84,38.26,43.56,44.18,51.8,58.95,50.6,49.16,50.3,59,56.35,59.55,52.8,57.95,61.55,60.65,62.65,72.4,78.1],"ANET":[20.93,22.47,30.35,29.47,25.42,29.32,34.94,34.64,41.67,49.34,54.16,71.93,74.1,81.68,102.53,86.01,89.78,135.87,128.11,129.3,159.47],"AON":[253.24,288.39,291.11,289.84,270.59,280.78,303.07,301.71,312.03,334.34,326.77,314.23,281.26,346.3,387.71,409.32,376.16,371.96,351.17,337.8,316.06],"AOS":[71.54,72.6,79.46,66.63,60.44,56.42,60.48,66.77,64.58,73.57,76.74,83.94,82.2,81.26,74.65,66.38,63.01,70.38,66.02,77.93,56.72],"APA":[23.06,19.05,25.25,37.29,47.62,37.92,46.72,39.63,32.04,45.08,36.2,30.41,29.44,26.74,22.34,18.89,17.33,23.84,25.28,31.69,36.43],"APH":[33.79,38.17,39.99,37.06,34.64,36.72,40.44,38.85,37.91,44.28,46.14,55.4,65.89,61.91,73.08,63.45,90.36,109.25,139.22,135.16,148.76],"APP":[68.86,74.3,86.13,60.34,38.31,25.05,14.29,13.38,24.83,43.19,38.25,62.26,82.7,88.13,340.59,337.34,401.91,481.73,623.59,432.98,613.09],"ARGX":[275.88,337.91,283.62,294.57,307.89,377.26,399.22,368.95,394.66,514.77,453.89,393.49,377.92,514.23,617.49,622.61,584.6,706.41,894.9,756.76,835.99],"ASM":[259.7,333.9,408.6,276.3,288.3,261.3,273.5,303.6,402.6,443.1,475.75,569.4,646.8,608,511.8,508.6,474.1,416.7,469.3,704.6,898.4],"ASML":[551.1,714.2,732.9,577.2,530.4,467,582.2,574.6,677.2,611.7,637.5,894,880.5,818.7,664.1,690.3,646.2,636.1,926.7,1210.4,1384.8],"ASSA B":[257.9,277.8,262.8,252.5,238.1,210.5,241.9,253.7,243.7,248.2,269.9,294.5,307.6,332.4,338.1,329.5,298.7,335,356.5,382.4,332.7],"ATCO A":[128.4,147.6,141.4,119.85,108.02,105.58,130.9,123.86,157.2,145.1,162.85,180.1,201.9,185.45,177.05,181.3,152,153.15,161.45,190,177.45],"AZN":[112.5,117.44,109.76,122.68,132.24,123.58,136.68,130.42,145.68,136.28,129.58,129.2,157.98,171.44,134.08,152.2,143.86,160.38,181.04,203.73,185.67],"AZO":[1410.85,1540.09,1806.83,1817.06,2035.11,2145.59,2552.97,2456.37,2373.58,2542.39,2641.75,3035.99,2772.62,3139.67,3179.52,3477.76,3749.81,4179.84,3946.99,3882.47,2935.19],"BA.":[528.4,566.2,553.6,746.2,778.2,761,815,904.6,944.8,1007.5,1059.5,1250,1395.5,1324.5,1255,1611.5,1919.5,1791,1609.5,2241,2023],"BALL":[82.22,96.66,90.91,86.84,71.27,55.62,55.85,54.66,51.63,54.93,56.34,64.28,69.66,63.9,62.83,52.14,52.15,51.06,49.03,66.42,54.67],"BBY":[114.9,116.78,102.25,97.18,80.08,71.85,86.47,82.54,72.9,75.27,73.42,77.92,86.94,100.94,90.93,86.74,68.27,74.46,77.24,61.59,77.95],"BC":[51.75,50.05,56.75,46.62,46.72,51.1,65.95,80.3,80.1,75.45,75.4,112.8,93.6,87.95,94.25,123.4,106.4,98,92.08,78.58,82.48],"BEAN":[392.5,481.5,533,489,382.5,362.5,438,473.5,424.8,460.8,426.4,421,414.4,570.5,591,604.5,798,865,774.5,763,827],"BEI":[96.7,103.4,88.62,92.68,95.34,99.42,105.35,112.7,119.2,121.7,129.75,132,144.1,130.1,122.9,134.6,118.75,98,91.34,97,69.8],"BESI":[68.8,79.86,85.8,75.26,56.62,45.89,63.76,73.76,104.6,105.6,131,168.3,133.15,117.9,114,107.05,103.95,115.5,129.75,188.5,284.4],"BGN":[33.59,37.48,37.42,31.71,32.29,25.89,31.91,32.63,29.41,33.58,32.84,34.36,38.34,40.42,43.7,50.55,51.6,49.4,54.4,53.35,54.7],"BKNG":[93.13,91.47,82.68,82.88,89.54,74.1,82.41,102.09,102,124.6,126.38,139.99,150.55,152.55,208.97,197.85,221.56,220.22,195.67,167.19,167.43],"BKR":[25.52,22.5,23.42,28.34,37.41,24.6,29.26,31.09,28.61,36.81,33.79,29.96,32.15,33.99,43.69,43.6,37.32,45.36,50.16,64.83,63.88],"BLK":[876.91,943.82,900.33,714.81,660.51,664.85,722.18,680.56,668.84,706.19,756.35,814.83,777.37,886.43,1020.11,966.47,978.07,1114.77,1039.94,1068.31,1046.88],"BMED":[8.09,8.79,8.46,7.09,7.21,6.23,7.88,9.17,8.01,8.41,8.22,9.93,10.61,11.11,10.92,13.82,14.64,17.23,18.43,17.86,19.81],"BUZ":[16.38,16.38,16.81,17.57,16.4,15.9,17.6,16.7,18.3,16.5,17.3,18.5,17.2,20.8,21.2,20.2,14,14.3,12.1,12,13.3],"BOL":[4.29,5.03,4.77,4.35,4.89,4.78,5.46,5.36,6,5.4,5.4,6.34,6.26,5.84,5.8,5.85,5.55,4.98,4.79,4.82,5.44],"BSX":[42.93,45.58,38.14,43.36,39.92,40.99,46.12,46.82,51.5,53.62,56.14,67.13,75.5,81.14,90.43,104.87,104.17,106.66,101.01,76.22,48.31],"BT.A":[179.8,168.65,166.3,183.55,187.6,146.05,120.55,140.5,148.65,115.4,123.65,104.65,132.7,139.7,160.9,156.3,179,212.2,177,211.4,208.8],"BVI":[25.31,28.28,28.53,25.44,26.41,24.12,25.29,26.85,24.21,24.81,22.21,27.06,27.68,29.86,28.82,29.12,30.08,25.68,26.78,29.48,26],"CA":[16.88,15.93,14.8,17.63,19.3,16.53,16.65,18.08,17.14,17.28,17.3,15.35,15.39,14.6,13.71,12.55,13.18,12.23,13.47,15.9,16.03],"CAP":[152.6,191,207.9,182.5,176.1,170.15,178.6,178.35,167.8,172,187,225,185.65,187.2,150.85,148.2,145.25,120.4,136.3,103.85,101.95],"CASY":[217.69,205.08,190.69,185.51,207.25,215.7,234.79,210.37,225.16,243.24,276.31,306.85,330.97,354.92,421.08,408,440,497.98,569.13,687.01,767.14],"CBOE":[110.63,127.29,127.09,117.2,112.42,121.23,126.82,126.71,133.6,150.36,180.26,187.02,174.99,212.84,211.91,214.96,231.1,231.88,255.28,297.49,333.56],"CBRE":[89.66,97.35,95.02,95.54,79.59,77.49,79.54,84.39,75.02,86.02,81.41,92.98,86.59,115.66,138.39,140.62,124.56,159.56,159.34,144.97,125.04],"CDNS":[125.75,164.15,175.05,150.53,153.22,170.04,176.78,191.43,232.39,243.56,270.35,315.24,286.15,256.28,310.27,241.74,292.53,342.81,309.62,303.36,374.93],"CDR":[153.38,170.36,185,168.3,108.36,81.5,123.58,132.26,124,150.45,111,110.35,134.25,181.4,170.2,221,221.5,245.7,255.8,243.9,232.6],"CF":[55.19,44.98,57.29,82.35,95.51,102.42,103.64,85.15,60.24,79.21,76.31,82.5,80.54,79.11,90.96,77.97,92.97,87.43,79.8,104.3,112.35],"CFR":[122.08,113.55,123.57,134.16,124.45,131.27,141.13,133,102.23,95.74,102.15,107.55,100.08,112.49,140.1,134.92,126.19,129.53,124.68,140.21,135.52],"CHD":[84.87,84.33,90.68,96.89,88.37,84.86,82.24,83.13,92.75,96.26,95.37,100.28,107.29,105.29,111.24,112.06,99.04,93.25,84.58,103.95,95.63],"CHRW":[96.42,89.16,93.87,104.82,108.94,114.88,98.77,99.38,94.87,88.35,83.26,73.88,87.11,103.61,106.18,100.37,96.12,128.89,160.32,187.24,178.65],"CI":[257.68,211.05,194.72,237.1,264.58,288.04,323.45,288.75,253.39,276.67,269.02,332.96,341.49,365.48,337.06,311.51,314.99,300.72,273.57,290.85,277.4],"CIEN":[53.5,56.88,59.97,67.3,51.35,45.48,44.69,48.55,47.03,48.47,46.75,60.84,47.92,55.35,69.52,74.69,81.75,93.59,200.92,353.73,580.23],"CL":[82.48,78.33,75.39,76.04,78.2,79.8,77.75,72.55,74.9,73.27,78.7,86.49,92.47,107.78,97.11,92.81,91.93,84.39,79.94,97.3,90.13],"CME":[213.15,199.21,220.01,233.45,199.37,199.42,177.9,184.23,180.02,202.89,219.54,219.21,201.75,212.64,235.61,256.88,290.71,265.4,278.99,326.46,273.54],"CMG":[27.22,37.97,32.04,29.76,27.49,32.26,32.52,29.7,41.65,38.77,44.68,53.78,61.53,53.52,60.54,54.33,49.84,41.75,34.24,36.69,31.86],"CMI":[261.76,234.87,209.12,196.07,207.85,214.92,249.26,249.21,206.86,236.64,226.31,270.26,275.22,304.32,377.3,355.97,317.24,395.23,496.15,580.37,646.63],"COF":[166.25,161.68,138.37,140.68,124.96,104.81,99.32,108.58,106.24,103.5,113.93,136.77,137.12,145.6,187.52,196.18,191.46,223.27,220.37,194.32,187.93],"COHR":[67.62,62.66,60.58,68.05,61.92,44.51,37.25,43.11,37.34,37.54,38.22,63.47,70.1,71.88,103.62,68.27,76.78,87.8,163.5,298.91,361.47],"COP":[58.27,54.65,69.2,96.96,115.75,107.53,123.06,106.25,99.53,122.14,115.23,114.24,113.87,109.85,106.14,92.63,86.72,98.99,90.26,118.24,113.98],"COR":[114.32,122.68,114.08,141.97,150.01,147.61,171.63,156.51,172.59,174.96,204.09,237.03,230.51,243.72,249.87,255.38,292.07,294.85,360.12,372.65,269.36],"COST":[378.23,456.52,529.84,522.93,456.99,529.17,503.86,478.67,512.6,544.25,596.25,749.44,815.39,878.57,975,1046.85,1056.85,938.82,911.96,1002.77,956.32],"CPAY":[276.6,263.86,200.83,226.11,242.72,211.61,196.28,213.5,228,272.86,251.63,276.6,258.35,314.37,382.99,365.94,322.07,317.79,296.27,332.01,361.8],"CPG":[16.4,15.24,14.99,16.19,17.69,18.32,18.67,19.13,22.14,19.92,20.26,21.67,21.68,24.02,26.96,28.08,25.91,25.17,23.41,22.53,32.17],"CPRT":[31.45,36.24,35.63,30.21,28.23,29.47,33.83,34.9,43.9,44.98,50.13,53.58,52.65,53.52,62.02,54.65,50.8,48.48,39.15,38.31,32.77],"CRH":[52.64,52.97,48.02,43.3,40.92,36.12,40.45,47.46,48.29,57.17,64.49,83.6,78.98,88.07,102.46,99.97,90.99,111.28,119.68,117.72,108.79],"CSCO":[52.62,59.04,55.03,54.62,45.23,45.29,49.97,48.34,49.74,57.84,48.47,48.4,46.65,50.06,59.43,63.48,63.85,67.8,76.04,79.42,120.42],"CSGP":[85.43,86.84,75.23,59.83,61.23,69.99,82.95,70.03,79.73,82.57,85.28,88.27,78.05,75.93,80.07,75.39,73.27,88.12,68.02,45.17,32.2],"CSX":[33.43,32.54,34.44,33.34,32,31.61,32.68,30.86,31.38,30.63,33.4,38.23,33.18,34.58,36.34,31.93,31.24,32.19,34.85,43.17,45.26],"CTAS":[88.25,99.03,104.4,93.04,97.7,101.89,115.61,107.29,119,126.32,139.56,157.09,168.64,199.85,222.64,207.43,226.69,205.51,185.43,201.6,171.26],"CTSH":[71.19,76.83,76.86,85.8,74.18,63.44,62.62,62.37,62.19,71.73,70.82,78.61,65.78,76.77,80.82,83.51,80.27,71.78,77.43,63.5,55.76],"CTVA":[45.97,44.38,44.66,50.37,62.33,60.81,66.25,62.15,53.86,51.11,46.2,53.66,55.57,55.57,62.23,60.4,70.95,73.92,66.54,80.52,78.28],"CVC":[16.35,16.35,16.35,16.35,16.35,16.35,16.35,16.35,16.35,16.35,16.35,16.35,18.1,18.75,23.43,22.06,15.95,17.16,13.97,12,13.74],"CVS":[85.87,85.71,88.78,102.05,96.54,99.93,101.65,82.47,68.88,65.67,68.48,73.84,60.21,57.38,59.08,64.9,63.6,74.09,79.1,81.66,90.98],"CVX":[106.65,95.71,112.1,149.72,176.32,155.54,182.49,162.05,152.16,164.3,144.81,152.81,157.46,144.66,162.21,153.09,137.84,161.83,152.54,189.6,182.46],"DAL":[47.7,40.4,33.53,37.64,39.54,31.09,35.38,38.51,36.38,42.86,38.05,42.16,50.79,42.37,63.41,58.45,48.5,61.13,64.15,64.25,82.48],"DB1":[134.1,147.05,140.25,149.85,155,166.1,178.05,166.1,164.05,164.25,175.65,193,183.5,202.6,222.2,256.2,284.4,249.8,225.5,232.5,246.1],"DE":[364.61,376.71,341.55,358.65,352.15,363.77,441.81,419.75,352.57,418.9,368.81,367.85,368.12,385.69,462.95,465.83,507.84,476.78,468.11,630.88,542.18],"DECK":[56.97,69.39,66.26,45.24,43.51,53.31,65.07,69.26,77.5,88.79,114.18,150.55,181.1,149.84,201.9,137.24,105.01,122.88,92.02,114.51,113.85],"DELL":[52.13,49.04,55.7,49.88,50.67,37.65,44.9,40.44,45.46,68.19,71.93,124.59,132.03,110.77,125.84,95.56,108.08,120.96,132.09,153.55,420.91],"WDH1":[11.19,11.19,41.06,36.63,41.39,41.39,41.39,41.39,41.39,41.39,41.39,41.39,41.39,41.39,41.39,41.39,41.39,41.39,29.32,26.32,33.36],"DG":[93.96,93.75,86.32,91.48,89.31,91.71,98.26,107.52,107.02,102.72,113.32,117.3,114.9,108.3,97.26,111.65,127.8,115.45,122.55,138.4,125.05],"DGX":[127.27,153.54,151.24,131.92,138.62,126.12,152.61,139,134.05,130.52,136.17,124.68,141.11,156.97,161.51,176.95,174.4,178.7,183.77,210.25,194.9],"DHL":[55.77,58.97,53.55,43.56,37.28,35.63,38.17,40.4,42.28,42.87,43.99,42.54,38.65,39.72,35.15,38.38,39.23,39.28,45.46,48.67,51.2],"DHR":[217.38,290.43,283.44,241.16,231.38,242.78,243.39,217.52,206.29,235.45,223.48,255.87,261.38,264.23,241.29,205.69,189.23,203.79,224.14,206,182.67],"DLG":[36.56,38.74,30.42,27.8,22.16,17.06,21.7,23.54,18.3,24.68,28.04,28.88,32.2,28.14,28.36,33.92,28.44,30.24,36.38,38.22,35.68],"DNP":[28.38,32.33,33.8,29.91,29.71,33.55,36.51,37.34,44.2,37.77,45.65,46.17,39.66,32.25,39.12,50,54.1,45.61,40.79,40.2,30.8],"DOV":[151.13,173.89,162.83,151.67,132.78,129.06,142.49,150.12,135.06,148.7,143.21,167.3,181.29,180.25,204.7,193.29,176.08,175.77,184.89,226.4,211.36],"DPLM":[2874,3094,3266,2614,2572,2400,2920,2806,3008,3134,3374,3482,4096,4422,4514,4494,4612,5470,5510,5595,6990],"DSY":[37.6,48.4,53,41.4,37.6,36.6,33.8,36,41.2,36.4,42.6,42.8,37,35,31.8,38.6,32,26.4,23.8,18.5,18.7],"DTG":[30.53,30.53,30.53,25.42,29.38,25.15,31.35,30.23,28.42,32.07,30.12,43.74,39.37,34.06,35.96,42.02,37.2,39.81,36,41.93,42.29],"DVA":[119.86,130.77,94.75,111.01,95.4,86.93,73.23,82.33,94.71,102.99,104.31,126.92,145.61,151.98,163.74,143.1,134.41,136.95,119.24,153.98,194.36],"DVN":[30.2,28.24,40.84,59.25,76.48,68.16,68.28,54.74,46.78,52.92,45.17,44.39,47.08,43.02,37.61,34.41,31.14,36.42,37.86,44.95,44.49],"DXCM":[91.42,136.23,137.09,102.1,70.96,83.08,118.03,110.76,119.58,101.9,116.62,121.74,115.23,72.36,79.31,85.99,85.51,74.3,63.52,73.78,73.74],"EBAY":[61.37,76.15,66.81,54.35,46.97,44.77,45.16,45.75,43.26,45.1,41.73,48.05,53.61,58.8,63.17,65.22,74.53,89.89,82.73,88.78,109.27],"ECL":[215.11,224.97,220.3,170.51,162.87,162.4,151.94,158.52,169.12,182.7,192.4,225.51,232.92,247.93,248.45,269.82,265.15,274.79,272.86,303.46,256],"EDEN":[44.37,48.21,39.5,40.2,44.69,50.12,52.82,54.04,60.56,58.48,50.9,47.84,43.42,37.09,31.18,31.09,26.64,24.5,18.87,19.74,23.34],"EDV":[6.02,7.04,6.75,7.06,7.3,7.46,6.99,6.64,6.25,5.47,5,5.42,4.97,5.26,4.38,4.23,4.1,3.84,3.74,4.04,2.88],"ELISA":[48.47,54.3,53.72,49.29,52.86,53.16,51.22,53.62,52.6,45.37,41.34,42.04,43.34,45.48,42.92,44.92,46.72,45.66,37.56,43.4,41.24],"ELV":[394.22,369.38,404.65,451.5,499.19,490.17,525.25,469.03,464.43,442.38,483.12,499.11,542.72,562.29,410.39,395.5,377.05,322.33,329.68,294.07,393.19],"EME":[127.75,120.48,119.51,111.24,104.58,117.24,154.01,166.99,165.46,226,214.32,319.99,373.1,358.63,505.09,395.73,469.55,620.41,607.78,735.78,826.82],"EMSN":[847,986,897.5,894.5,807,669,666.5,717,704.5,665.5,621.5,624,732,715,627.5,635,616.5,610.5,553,629.5,713.5],"EN":[33.7,36.15,30.38,31.26,31.91,29.2,29.81,32.49,30.2,31.83,35.05,36.11,36.25,32.28,27.67,33.22,38.45,36.14,43.06,52.04,50.46],"ENR":[26.55,25.17,23.24,20.23,17.86,14.17,16.01,19.5,24.18,13.08,11.31,14.27,25.3,26.17,51.46,54.22,87.8,89.02,112.85,163.35,162.8],"ENX":[14.9,14.9,14.9,14.9,15.4,14,13.9,14,12,12.8,14.7,16.3,18.2,18.8,20.6,23.8,28.4,28,26,27,27.8],"EOG":[84.59,66.36,85.35,116.41,139.93,118.71,140.54,118.01,108.15,130.98,123.6,116.1,119.64,123.63,131.24,120.54,111.34,126.1,109.71,128.65,133.38],"EQT":[21.77,18.75,18.36,24.42,49.8,46.31,41.52,33.3,35.1,44.22,40.24,37.01,40.98,32.92,44.53,48.71,56.66,52.38,60.52,61.64,54.93],"ETN":[146.29,166.75,161.47,146.45,137.72,138.77,163.36,173.83,179.04,233.67,230.46,293.7,324.46,289.73,372.22,278.46,318.86,343.75,339.71,377.4,400.6],"EVO":[21.86,25.01,22.9,14.48,13.4,10.67,9.19,8.79,11.18,11.81,9.96,7.53,4.97,3.45,4.72,4.21,3.98,3.4,3.19,3.28,3.07],"EVRG":[61.47,68.62,63.14,60.88,70.01,69.74,58.88,58.05,57.2,53.6,51.76,49.12,54.29,59.7,63.61,69.52,66.5,71.27,75.52,84.01,82.04],"EW":[95.12,119.43,107.43,111.61,97.34,90.12,77.56,79.85,85.23,76.38,68.36,85.22,87.86,68.75,70.53,71.39,78.1,81.77,85.27,87.18,86.47],"EXPD":[123.19,122.92,123.01,101.51,107.84,103.81,115.25,105.38,111.48,116.37,120.09,120.64,121.21,123.36,121.47,118.55,111.21,120.85,146.45,145.63,157.99],"EXPE":[177.31,146.17,155.66,187.85,126.23,101.73,105.93,106.16,98.66,109.57,139.31,136.84,114.06,136.74,185.01,193.5,167.17,212.12,258.95,213.24,225.79],"EXPN":[2703,3240,3431,2908,2568,2552,2954,2815,2842,2768,2924,3358,3630,3705,3745,3763,3676,3822,3311,2727,2573],"F":[14.81,13.11,19.58,16.7,13.55,15.19,14.08,12.32,12.11,12.14,10.58,12.45,12.19,10.98,10.98,9.39,9.98,11.72,13.16,13.39,17.44],"FAST":[26.27,27.73,29.24,25.78,26.95,25.48,25.78,25.77,26.95,28.64,30.41,36.42,32.15,33.54,41.33,37.19,40.91,49.19,40.15,46.33,44.2],"FBK":[13.73,15.51,15.69,14.05,13.09,10.67,15.45,16.1,12.44,12.56,12.37,12.85,14.76,15.47,15.38,18.17,18.97,18.77,20.85,20.04,20.96],"FCX":[44.21,35.89,36.23,47.91,39.64,28.09,39.57,43,35.47,41.49,39.24,37.93,52.04,41.36,43.64,35.53,40.15,44.94,43.07,68.29,65.71],"FDS":[324.11,385.84,462.82,411.86,374.59,440.06,472.16,412.77,390.29,435.48,455.17,461.32,394.89,426.65,489.47,458.09,456.56,368.88,277.13,219.94,245.47],"FFIV":[179.2,202.53,223.88,196.49,161.89,155.3,155.03,144.04,146.25,164.61,172.6,189.97,166.91,198.85,252.14,284.15,286.02,306.73,238.57,278,383.45],"FICO":[498.96,468.98,363.58,475.46,406.25,442.82,621.14,682.79,793.24,896.56,1127.71,1295.2,1293.82,1688.41,2332.11,1864.88,1748.26,1504.88,1768.68,1407.54,1250.59],"FIX":[84.53,74.72,93.73,83.53,89.3,100.99,125.78,146.94,148.38,185.96,196.61,314.43,316.74,314.82,489.53,345.58,477.08,698.61,961.2,1438.24,1828.21],"FME":[65.52,65.42,53.18,57.12,55.5,33.45,30.32,35.45,40.19,44.3,37.77,35.35,39.04,34.53,42.98,45.57,50.02,44.01,40.66,40.11,37.07],"FOX":[35.99,34.24,32.22,37.64,32.15,31.53,30.28,32.04,29.2,28.75,28.26,26.99,32.28,38.03,44.41,53.45,50.58,55.62,59.34,51.99,57.39],"FRE":[43.87,44.01,33.84,29.86,31.56,24.42,26.51,25.09,25.75,29.44,29.09,25.8,29.17,33.45,33.41,39.23,44.03,46.71,46.37,50.28,36.27],"FRES":[915,844,907,724.8,769,657.6,903.2,778.2,677.2,569.2,593,463.6,616.5,542,647.5,754,1233,1825,2820,4120,3286],"FRO":[8.76,7.62,6.41,9.53,10.12,11.66,13.69,18.52,14.56,17.48,20.11,22.58,27.95,23,15.71,16.23,18.12,20.89,22.85,39.62,34.67],"FSLR":[76.88,94.06,101.64,75.62,70.87,127.84,168.54,195.68,208.74,186.37,160.29,158.05,272.72,212.74,207.92,127.63,149.65,195.78,263.54,199.86,306.79],"FTNT":[43,61.69,61.05,67.57,57.81,48.55,55.38,58.44,68.64,60.87,52.49,70.44,58.8,77.13,95.32,106.54,102.47,76.93,81.82,79.18,137.97],"G1A":[36.27,39.56,45.1,38.42,36.45,32.35,39.34,41.76,39.59,36.32,34.01,37.96,37.7,42.4,47.5,56.2,59.15,62.55,57.65,64.35,55.45],"GD":[189.54,199.79,189.45,233.32,226.22,225.37,252.27,227.69,205.33,226.37,249.69,271.95,298.26,294.92,276.44,254.04,275.71,324.39,332.38,364.78,346.82],"GDDY":[82.66,73.99,68,82.52,72.83,75.9,79.73,75.76,75.07,72.65,102.01,113.72,140.29,159.5,197.62,177.69,182.07,144.39,127.94,88.22,85.83],"GEBN":[656.2,766.8,711.2,605.6,521.4,438.1,460.4,504.4,488,455.4,486.4,517.8,552.2,543.6,534,530.6,617.8,587.2,624,632.8,513.4],"GEHC":[60,60,60,60,60,60,60,75.3,79.83,69.25,69.41,92.72,77.15,84.8,83.08,86.45,70.15,71.6,79.24,80.16,62.34],"GEV":[131.25,131.25,131.25,131.25,131.25,131.25,131.25,131.25,131.25,131.25,131.25,131.25,170.37,192.55,337.54,315.98,485.16,579.68,576.9,881.18,968.32],"GILD":[65.32,71.87,68.93,60.26,64.77,64.95,87.9,79.59,76.21,76.65,77.65,72.31,63.43,79.7,94.02,115.99,108.91,112.71,124.33,150.03,134.43],"GIVN":[4023,4577,4490,3875,3479,3036,3184,2821,3026,2929,3303,3710,4214,4348,3903,4082,4154,3392,3385,3063,2900],"GLW":[43.12,39.16,36.85,38.57,35.44,33.87,34.24,34.33,30.87,32.86,28.84,32.45,37.36,40.67,49.24,48.25,50.04,68.47,82.9,157.86,181.16],"GNRC":[321.75,438.71,403.57,321.24,243.86,233.01,103.09,118.24,113.56,118.94,122.3,114.18,141.37,147.03,187.45,130.88,120.64,179.51,149.22,230.38,277.91],"GOOG":[121.49,145.84,141.62,134.17,114.14,110.55,101.28,90.51,124.37,136.8,133.32,138.08,174.42,158.61,172.98,168.66,170.37,211.99,315.12,306.36,376.43],"GRMN":[142.92,175.5,132.23,110,103.51,89.4,94.36,96.75,103.87,106.04,123.64,137.43,163.2,180.1,213.46,226.22,202.95,234.29,196.88,255.16,233.92],"GSK":[1347.64,1482.23,1552.54,1556.37,1720.37,1357.2,1415.4,1422,1347.6,1387.6,1436,1661.8,1598,1650.5,1341.5,1479.5,1517,1447.5,1800,2180,1881.5],"GTT":[67,70.5,71.5,86,121.1,125.3,117.5,100.3,94.25,117.3,126,143.8,131.6,131.4,132.9,151.8,166.3,158.1,172.4,199,197.9],"GWW":[462.66,429.23,477.26,466.37,494.39,557.05,603.18,671.01,655.31,710.78,803.58,980.9,888.56,960.06,1193.99,999.5,1074.44,1016.86,944.87,1152.25,1234.24],"HAL":[23.34,19.69,21.15,32.11,41.4,28.94,37.89,37.51,30,39.81,37.71,35.64,34.74,29.85,31.56,25.01,20.01,22.69,26.63,35.97,38.85],"HCA":[215.87,252.66,225.61,252.42,206.95,199.45,238.47,244.3,267.87,280.81,252.36,311.98,332.7,395.83,327.63,311.28,382.16,406.14,503,532.92,378.54],"HD":[316.31,323.64,400.42,320.25,297.19,293.37,327.07,290.79,288.39,333.08,319.62,384.45,328.01,364.74,426.96,389.69,367.96,406.31,357.33,370.81,317.14],"HLMA":[2634,3044,3035,2382,2181,1996.5,2219,2167,2413,2134,2133,2302,2240,2575,2736,2795,2912,3270,3532,4122,4682],"HLT":[126.61,125.32,129.96,142.17,138.42,127.67,142.3,145.5,137.67,151,170.84,204.88,198.16,215.65,250.47,263.58,249.13,276.01,283.04,304.8,327.66],"HO":[84.18,86.88,73.06,108.2,114.35,117.5,121.95,133.7,133,135.25,139.15,135.4,167.5,148.4,141.85,222.4,270.2,224.2,219.5,255.9,239.5],"HOT":[69.32,68.82,67.5,56.88,60.52,48.95,55.58,65,79.25,97.55,101.9,110.1,100.4,110.5,118.3,159,161.7,216.4,290.6,407.2,484.6],"HPQ":[29.86,29.22,36.46,34.07,40.34,28.17,29.86,28.86,29.42,30.37,29.5,29.41,35.32,35.38,36.45,30.04,24.91,28.94,24.39,18.7,27.04],"HSY":[172.65,178.22,175.51,204.86,209.69,227.56,231.88,236.65,259.66,213.85,190.98,188.05,196.42,197.34,177.82,178.5,161.45,185.78,185.08,235.69,194.03],"HUBB":[192.01,203,196.05,175.98,188.79,208.22,252.33,249.64,287.25,328.53,303.48,384.77,385.75,378.96,457.23,354.95,381.34,430.15,427.85,516.98,473.61],"HWM":[35.61,31.9,27.41,33.11,35.68,35.05,38.41,42.8,43.73,49.69,52.9,67,84.63,93.02,117.69,131.02,172.65,173.22,198.74,265.11,258.25],"IAG":[3.71,2.29,2.98,3.19,2.22,1.12,2.2,2.33,2.88,2.43,2.64,2.74,3.85,4.86,5.43,5.54,7.47,9.43,15.38,24.25,17.88],"ICE":[109.81,120.62,129.02,127.75,101.99,102.04,109.53,100.9,106.37,117.01,114.24,138.57,133.65,161.44,158.29,173.2,180.32,175.09,156.94,164.78,147.85],"IDXX":[550.59,676.9,599.45,535.14,369.63,349.93,439.17,469.1,469.84,511.29,482.6,576.87,492.43,469.01,430.77,437.15,514.8,639.45,728.97,636.7,563.53],"IEX":[223.87,220.63,221.15,188.72,191.4,202.61,240.74,223.48,201.32,228.28,203.04,239.47,206.11,202.89,231.81,188.53,179.17,162.15,174.64,211.54,210.83],"IFX":[33.46,36.58,41.3,28.98,28.95,23.92,32.5,33.9,35.69,32.97,36.06,33.99,36.5,32.85,31,35.06,33.88,34.6,35.46,44.41,81.5],"L":[58.5,55.66,53.43,59.71,64.75,55.51,58.04,61.25,56.39,62.3,70.01,74.43,75.87,81.82,86.16,87.15,89.67,96.22,106.4,112.19,103.55],"IMB":[1597,1537.5,1563.5,1641.5,1791.5,1895,2106,2017,1716.5,1783.5,1858.5,1697.5,1937.5,2184,2577,2821,2847,3097,3235,3296,2696],"IMI":[1701,1818,1743,1405,1407,1071,1387,1579,1607,1498,1580,1726,1870,1849,1801,2074,1957,2262,2450,2836,2782],"INCY":[82.89,77.03,64.96,68.7,74.98,71.35,80.68,77.83,61.51,64.69,54.02,59.05,58.8,66.31,73.24,70.26,65.31,85.98,102.04,100.04,96.74],"INDT":[217.9,282.5,260.2,205.4,221.4,188.8,226.4,224.5,258.3,208.6,232.9,279.7,268.2,322,286,307,258.2,235.2,232.4,226.2,193.5],"INTU":[438.66,563.13,663.89,468.58,408.37,425.5,416.07,401.27,422.12,549.6,574.32,666.52,567.22,624.81,634.07,601.09,764.99,661.99,631.62,419.06,331.53],"IPN":[85.4,83.38,86.8,105.15,93.4,94.8,107.2,106.8,110.9,118.3,102.6,101.5,121.8,109.7,108.9,112.5,103.7,116.9,124.7,164.4,156.6],"IQV":[237.25,262.23,259.25,227.83,210.11,211.62,220.55,210.77,198.97,224.33,216.91,252.45,216.47,248.81,201.79,184.85,139.1,183.74,228.47,174.27,182.21],"IR":[50.03,52.74,57.1,49.25,47.25,48.38,54.29,58.04,58.15,69.95,72.24,91.63,90.04,88.33,105.12,82.6,81.06,77.94,79.19,93.97,71.64],"ISRG":[278.68,354.24,319.93,291.55,216.39,206.11,274.49,227.33,310.54,310.41,315.2,397.9,403.86,483.44,542.85,566.98,553.29,469.07,567.37,496.25,424.64],"IT":[233.01,309.31,306.53,274.46,260.86,291.54,356.27,325.42,340.24,350.04,441.14,471.48,424.01,481.83,517,491.13,429.86,250.91,230.78,159.27,162.2],"ITRK":[5444,5362,5448,5318,4558,3873,4093,4162,4197,4144,4034,4588,4786,4906,4672,5155,4754,4664,4614,4742,5320],"ITW":[233.23,231.28,230.81,210.86,205.98,197.24,227.43,232.31,221.98,247.37,245.24,260.19,239.87,249.78,278.5,262.23,242.65,262.26,247.49,291.17,247.28],"ITX":[31.77,29.8,29.11,22.79,22.23,21.25,25.17,29,31.45,35,38.31,41.1,44,48.66,53.68,51.16,47.44,42.17,49.29,54.06,53.3],"IVZ":[27.19,25.16,21.97,19.71,19.07,16.37,19.43,17.53,14.74,16.03,14.86,15.53,15.65,16.52,18.09,16.76,14.38,21.65,24.66,26.13,28.46],"JBHT":[172.14,179.14,185.99,200.36,172.91,173.77,182.81,182.15,169.33,191.73,189.8,203.33,160.66,173.09,189.24,157.82,136.65,144.25,179.73,232.07,276.43],"JBL":[56.45,61.09,58.26,55.18,60.63,58.29,72.55,84.19,89.95,115.42,116.91,147.18,117.23,103.41,135.19,146.45,168.02,202.08,209.99,261.18,364.56],"JCI":[67.03,74.32,74.97,62.58,54,55.65,66.9,63.19,59.96,59.78,53.89,60.12,71.66,70.76,83.67,82.56,100.39,105.96,114.94,145.46,134.06],"JKHY":[153.85,177.3,147.96,179.12,186.13,194.82,190.73,163.94,151.17,158.08,160.79,171.96,163.26,175.08,175.66,178,180.37,160.77,174.2,164.2,136.32],"JMT":[15.88,18.08,19.41,19.81,18.74,21.82,21.6,19.41,23.76,22.94,22.68,21.72,20.76,16.66,18.13,20.86,21.88,21.34,20.56,22.08,18.16],"JNJ":[165.53,173.74,158.08,164,177.71,165.34,178.74,152.57,154.54,160.48,158.38,162.12,147.74,167.16,154.8,167.28,155.4,178.06,205.34,248.56,225.33],"KBX":[101.65,102.6,89.1,74.96,64.44,47.77,55.44,65.52,65,63.46,57.44,65.92,71,74.15,71.9,87.9,88.35,89.6,90.7,109,102.5],"KCR":[12.77,12.93,11.92,9.62,9.56,7.42,9.5,10.96,11.7,10.78,12.21,16.08,17.53,21.23,21.62,22.8,23.12,24.5,29.57,32.5,28.4],"KESKOB":[28.42,34.77,28.38,25,22.97,20.83,21,20.43,17.64,18.17,17.68,17.79,16.77,18.47,18.86,18.36,21.08,18.98,18.29,20.52,20.98],"KEYS":[141.97,178.72,193.67,153.29,143.55,164.06,181.48,157.12,163.14,133.88,137.88,157.07,137.01,148.05,171.59,155.89,158.36,163.79,197.54,313.27,338.33],"KGH":[208.8,174.35,145.5,166.15,141.75,84.22,119.95,132.2,108.55,117.9,121.4,109.1,154.15,138.95,130.05,131.7,125.4,129.4,217.9,326.5,349.55],"KLAC":[31.57,33.54,41.22,33.68,35.7,33.71,39.07,37.83,45.25,50.7,54.9,71.76,75.42,74.14,66.6,69.11,76.24,84.64,115.72,153.49,192.17],"KMB":[130.01,139.68,131.76,128.67,131.4,128.52,136.6,124.72,133.93,127.46,124.04,122.9,134.89,147.35,139.56,143.35,141.68,128.84,108.54,109.74,97.6],"KNEBV":[66.46,69.74,60.26,51.28,46.49,39.08,48.37,48.06,48.14,41.25,41.01,43.87,47.33,49.15,49.7,55.7,54.58,54.36,58.64,63.56,51.14],"KNIN":[302.9,335.2,265.8,255.8,247.2,218.3,229.9,253.3,258.8,260.7,255.9,257.3,255.7,264.6,213.3,214.6,183.95,165.2,162.1,182,180.35],"KO":[55.28,56.69,52.3,61.97,63.07,62,63.79,58.86,60,59.31,58.64,59.53,62.93,73.01,63.65,72.32,72,69.06,71.95,80.22,79.01],"KOG":[43.6,49.32,53.92,65.56,66.72,67.44,80.8,86.64,90.68,89.32,94.64,136.3,183,217.2,266.2,316.4,359.5,308.2,237.2,394.55,332.1],"KVUE":[26.9,26.9,26.9,26.9,26.9,26.9,26.9,26.9,25.28,22.96,20.69,18.82,19.24,22.1,24.26,23.79,23.67,20.78,17.22,18.89,17.28],"LDO":[7.18,7.05,6.11,8.12,10.17,7.89,7.69,10.62,10.33,13.31,14.34,20.24,24.14,21.3,25.85,44.78,53.66,50.94,45.68,58.22,54.42],"LDOS":[103.2,97.76,87.46,104.75,104.74,95.06,109.62,96.66,78.47,98.84,108.94,127.44,145.52,155.8,164.13,129.2,141.65,180.89,188.42,179.4,127.8],"LEN":[95.35,105.12,105.1,87.45,77.09,75.01,85.34,92.58,104.69,116.81,127.38,156.32,155.58,172.68,167.93,117.93,105.02,132.68,130.23,110.61,89.78],"LHA":[7.77,6.06,5.63,6.35,6.81,5.75,7.58,9.91,9.16,8.23,8.22,7.19,6.45,5.85,6.34,6.99,7.1,7.93,8.35,8.61,8.58],"LII":[349.07,334.78,301.96,267.52,206.79,248.85,268.36,252.23,282.98,382.36,418.29,472.95,496.31,561.95,667.46,586.98,551.78,543.57,489.46,563.4,502.16],"LLY":[198.42,257.4,249.13,249.5,311.08,309.13,370.33,314.17,436.49,557.11,584.04,782.12,831.26,956.53,799.8,929.72,747.12,735.19,1057.89,1017.97,1105],"LMT":[381.92,356.66,328.42,456.61,439.3,422.61,483.69,474.33,449.67,448.18,449.41,426.46,467.6,567.22,520.34,451.94,478.82,452.5,439.19,676.7,530.45],"LOGN":[113.15,95.28,74.36,69.6,58.46,47.77,58.08,49.94,57.84,61.52,75.5,77.86,87.38,76.4,72.56,89.46,67.34,83,90.86,70.7,94.9],"LONN":[588,774.2,730,640.8,563.2,510,509,559.6,575.8,492.5,334.8,465.6,484.8,548.8,528.8,577.6,568.6,571,555.2,530.2,500.4],"LOTB":[4785,5460,5410,5170,4650,5580,6160,6030,5990,7160,8070,8730,9580,11440,11380,8700,9020,8540,7610,10280,11000],"LOW":[191.85,203.43,245.34,221.5,191.72,195.76,215.48,194.31,203.92,232.51,203.92,244.69,216.73,245.46,272.05,246.16,225.52,258.74,246.39,257.17,214.36],"LPP":[11320,13750,13390,9165,10370,8215,9655,9610,12470,14110,15590,17910,17280,15290,16340,18210,14400,17290,16800,20600,22580],"LRCX":[64.9,59.98,69.35,54.06,50.58,43.2,46.31,49.09,61.99,70.2,72.21,98.15,93.56,76.57,78.51,75.78,82.48,97.03,154.79,231,318.18],"LSEG":[7482,8062,6752,6372,7144,7928,8270,7448,8458,8176,8992,9016,9150,10155,11290,11750,11310,9218,8794,8776,9022],"LTMC":[8.2,8.2,8.2,8.2,8.2,8.2,8.2,8.2,7.51,9.11,9.42,11.4,10.9,11.55,12.6,16.65,22.64,23.3,21.9,20.46,25.42],"LULU":[318.62,395.53,448.43,315.18,289.96,294.45,381.82,309.49,328.35,404.19,466.61,458.5,306.62,258.08,334.4,347.81,322.95,200.21,182.41,176.17,131.18],"MA":[359.79,349.57,306.28,344.48,357.06,325.25,360.8,353.5,370.88,415.57,414.36,476.63,443.19,482.12,531.36,574.92,581.22,591.87,543.97,521,493.98],"MAR":[145.18,134.83,142.5,164.91,170.59,153.95,165.19,169.44,171.14,205.82,209.28,250,228.38,230.72,286.24,277.72,261.21,264.48,303.44,330.47,375.6],"MAS":[60.62,61.23,65.67,54.58,55.67,50.77,51.76,51.61,49.06,59.72,62.16,77.6,68.7,78.31,80.5,73.94,61.33,72.38,64.77,69.8,70.25],"MBG":[64.92,58.95,70.75,66.38,67.29,55.77,64.4,73.57,70.42,66.37,60.11,73.97,66.34,62.16,52.83,59.79,51.43,53.69,58.92,56.88,52.18],"MCK":[191.83,202.99,215.41,271.75,322.21,363.83,379.72,351.75,389.23,412.34,464.65,525.88,573.16,573.95,621.29,644.53,721.75,691.62,856.89,990.95,742.44],"MCO":[330.92,382.11,380.27,322.35,282.38,286.78,306.08,289.28,323.67,339.32,371.05,382.04,401.65,481.97,497.41,502,479.93,498.5,487.24,466.1,453.25],"MDT":[124.79,134.17,105.47,103.66,97.78,88.53,79.25,82.08,82.75,82.13,79.99,83.6,82.12,88.96,86.54,94.3,83.74,93.33,103.34,98.1,73.81],"META":[329.13,382.05,310.6,203.49,188.64,165.36,120.44,173.42,272.61,296.38,324.82,502.3,477.49,511.76,592.83,655.05,670.9,735.11,640.87,653.56,632.51],"METSO":[9.93,9.1,9.18,7.09,8.85,7.41,9.05,10.05,10.2,10.66,9.16,9.94,10.85,9.15,8.39,10.66,10.61,11.07,14.31,17.33,16.28],"MKC":[88.93,87.4,86.55,96.25,90.72,84.79,85.73,72.97,87.58,80.46,65.99,67.81,71.9,81.2,78.37,84.73,73.44,68.8,66.4,69.9,47.37],"ML":[31.99,34.42,34,29.77,30.31,24.09,27.04,29.68,26.71,29.01,31.05,33.93,37.05,35.45,30.48,33.93,33.49,30.79,28.32,32.92,31.51],"MMM":[169.9,161.74,142.75,121.03,122.42,105.04,105.34,92.15,78.83,89.42,83.49,76.81,99.76,130.85,132.89,153.42,146.4,154.27,170.48,161.46,153.13],"MNST":[46.79,48.9,40.53,41.62,44.03,44.5,51.63,49.6,59.36,56.55,55.22,58.79,51.89,48.3,54.98,55.17,63.83,62.67,75.95,81.06,88.08],"MO":[49.36,50.08,42.99,51.57,54.08,45.37,47.01,46.15,44.58,44.11,42.6,40.86,46.55,54.07,57.18,57.31,60.63,67.13,59.14,68.69,69.58],"MONC":[57.46,54.86,65.62,49.24,44.89,43.5,49.88,59.7,61.88,62.62,50.68,67.46,61.8,54.68,46.6,65.74,54.76,49.4,58.12,56.58,55.86],"MOWI":[217.6,236,206.7,232.7,241.2,203.9,155.65,176.7,191.55,192,191.5,207.4,188.3,184.2,200.1,206.2,188,206.2,227.4,221,204],"MPC":[62.5,57.25,60.91,75.01,103.91,96.76,120.23,129.19,105.87,145.96,151.42,173.21,174.75,173.82,157.41,145.82,158.75,180.15,196.14,209.82,248.77],"MRK":[147.4,203.2,216.3,173.35,174.65,169.85,178.45,177.85,164.1,166.75,158.3,158.3,167.25,175.45,141.35,139.05,114.7,109,116.7,125.55,129.9],"MRO":[410.95,360.69,312.25,279.94,279.94,271.54,273.85,323.17,488.4,516.2,533.8,625.8,614.2,485.8,583.2,655,460.9,590.8,567.4,559.2,470.7],"MRSH":[138.81,158.05,163.74,153.74,156.41,162.57,173.03,162.01,174.42,195.77,197.4,202,206.51,229.03,233.04,239.48,234.76,205.44,184,186.43,159.97],"MSCI":[461.97,649.21,616.35,500.38,431.45,456.91,521.39,515.45,466.97,541.39,527.7,565.48,490.5,573.47,608.97,588.76,564.2,553.91,559.66,573.88,631.38],"MSFT":[247.4,301.83,330.08,294.95,272.42,260.4,254.69,246.27,332.58,328.66,374.51,415.5,413.52,409.44,430.98,388.49,461.97,505.12,486.74,398.55,450.24],"MSI":[205.14,243.46,245.95,216.21,217.62,244.17,271.78,263.35,282.22,283.68,325.32,335.56,366.4,440.37,496.7,427.35,419.17,479,373.35,486.11,403.28],"MTD":[1296.3,1552.67,1520.45,1393.34,1263.4,1208.33,1490.33,1417.97,1329.32,1222.5,1104.47,1267.98,1399.43,1398.06,1258.88,1268.64,1141.13,1276,1468.09,1325.09,1180.58],"MTX":[212.6,196.6,167.9,203.3,184.55,170.6,200.9,230.3,217.9,213.7,191.8,219,227,269.4,321.9,346.1,354.9,388,341.2,356.3,313.1],"MU":[84.15,73.72,85.15,86.26,73.55,57.31,55.49,57.34,69.09,70.39,75.93,95.15,128.17,88.58,98.55,90.54,98.18,118.48,240.46,412.67,971],"NDA":[79.58,71.74,78,105.6,87.76,58.1,76.44,93.88,72.64,71.82,78.24,59.02,76.4,68.4,75.3,84.45,78.3,97.2,118.3,168.9,216.2],"NDAQ":[54.82,65.99,66.34,56.66,50.76,59.99,68.49,55.55,55.03,51.94,55.9,56.53,58.74,71.39,81.65,81.97,84,93.59,89.36,88.09,92.52],"NDSN":[221.67,240.94,251.6,223.24,215.35,226.18,240.01,219.46,221.77,245.51,238.8,266.09,229.38,250.18,259.15,207.1,212.18,222.7,235.03,292.18,287.33],"NDX1":[16.75,15.1,14.45,14.88,10.17,9.18,12.24,14.55,11.58,11.06,10.38,11.31,14.62,14.3,11.86,12.88,17.92,20.78,25.1,43.26,41.3],"NEM":[60.32,84.6,110.5,77.54,66.36,57.32,50.36,53.38,74.64,63.18,80,88.24,85.25,93.3,97.9,114.4,120.8,118.9,95.9,68.25,62.5],"NESTE":[54.68,52.34,42.9,31.57,42.89,47.82,48.16,45.47,36.52,34.07,35.14,25.43,18.93,20.79,14.4,8.64,9.46,16.02,16.89,22.68,28.13],"NFLX":[49.91,58.21,61.78,38.62,19.29,23,31.69,31.35,40.31,43.99,46.57,61.93,63.38,67.53,89.77,97.37,121.9,121.41,109.13,97.09,86.02],"NKE":[110.58,139.52,150.92,119.1,111.26,104.7,105.68,110.94,96.9,95.11,103.3,95.11,86.55,75.62,75.25,74.56,53.39,66,56.6,52.38,39.63],"NKT":[79.1,79.1,79.1,79.1,79.1,79.1,79.1,79.1,79.1,79.1,79.1,79.1,79.1,79.1,79.1,79.1,79.1,79.1,102.3,106.8,136.2],"NOVN":[75.16,80.24,70.36,76.37,81.68,74.46,79.71,74.5,83.46,84.69,85.38,90.14,92.73,102.7,93.14,98.92,95.08,101.54,104.26,129.96,117.82],"NTAP":[76.71,89.32,89.46,77.33,72.51,72.16,68.07,64.6,71.96,77.6,91.28,105.31,118.96,118.95,123.29,95.73,98.77,115.37,112.27,100.15,174.29],"NUE":[110.74,116.26,104.69,131,130.71,130.4,149.25,170.74,133.03,172.58,170.41,190.7,166.81,144.43,156.37,134.07,120.4,146.4,160.7,180.57,250],"NVDA":[16.26,22.44,31.43,23.48,18.32,13.94,17.14,22.7,39.77,48.51,46.76,82.28,115,108,138.63,114.06,137.38,170.78,179.92,182.48,211.14],"NVR":[4841.02,5177.38,5404.56,4906.68,4387.68,4116.66,4739.86,5138.91,5570.61,6509.35,6320.35,7687.1,7627.32,9053.67,9180,7200.29,7043.41,8169.85,7517.09,7415.75,6104.8],"NXPI":[207.91,211.5,223,181.18,184.57,164.4,173.44,178.87,181,209.96,205.68,257.51,269.94,236.14,233.61,216.53,192.81,232.66,199.49,224.76,321.35],"ODFL":[133.93,146.45,175.21,155.06,128.71,138.85,150.45,169.3,158.82,217.93,202.87,222.14,169.33,194.78,224.85,172.28,160,149.9,139.67,207.75,225.15],"OMC":[83.02,73.39,66.57,81.63,72.92,66.64,79.86,91.47,89.3,80.21,81.81,88.44,90.36,99.33,105.01,80.71,70.49,76.93,72.01,85.36,72.71],"ON":[39.91,44.68,61.7,59.65,59.27,68.22,73.99,78.23,87.95,99.4,74.18,81.14,73.19,70.76,73.95,44.91,42.54,48.94,50.43,66.48,120.62],"ORK":[86.62,77.8,82.58,82.9,72.78,83.64,69.84,69.6,80.28,80.2,80.32,76.06,84.85,95.35,101.4,109.6,114.8,112.3,107.7,128.4,97.65],"ORLY":[35.84,39.5,42.45,43.77,41.64,47.1,57.15,54.95,59.69,63.16,65.37,72.36,63.77,75.79,83.12,91.73,91.38,103.19,101.24,95.03,86.88],"ORNBV":[35.01,34.32,36.19,40.98,37.89,44.67,51.4,44.07,40.29,38.17,36.49,36.61,38.43,48.17,44.4,54.48,60.15,67.5,61.3,67.5,71.35],"PCAR":[61.64,55.11,54.97,59.53,59.03,58.31,70.63,73.05,70.02,83.52,93.18,113.19,105.49,95.56,116.24,105.02,91.77,98.86,103.97,124.43,110.37],"PEP":[147.63,157.91,160.16,162.27,166.49,172.85,185.9,171.33,182.19,175.32,168.69,164.59,171.23,177.54,163.05,155.99,130.91,150.28,149.51,167.28,144.19],"PG":[132.88,143.84,146.4,153.31,145.64,139.64,149.25,137.66,143.96,154.51,152.66,158.85,164.65,174.52,179.7,175.59,167.78,157.99,147.44,163.51,143.56],"PGHN":[1355.5,1632,1589.5,1199,992.2,902.6,947.2,879.8,825.2,953.8,1155.5,1264.5,1202,1223,1282.5,1379.5,1076.5,1096.5,943,841.6,827.2],"PH":[313.25,293.96,293.1,287.62,272.5,267.65,297.52,353.35,325.99,422.46,440.16,537.8,513.08,575.35,700.69,650.56,660.3,749.93,856.12,1011.41,844.63],"PHM":[58.16,54.69,50.07,49.1,44.92,40.56,45.15,54.22,67.3,82.63,91.02,111.21,115.49,128.79,135.14,102.03,97.55,132.09,127.18,133.72,118.18],"PIRC":[4.93,5.14,5.58,4.6,4.65,3.73,4.33,4.89,4.47,4.6,4.56,5.63,6.01,5.53,5.16,6.12,6.19,5.84,6.01,6.2,6.31],"PKG":[149.79,153.94,129.51,143.12,157.47,136.48,136.16,138.7,124.83,149.56,169.71,180.19,182.87,206.08,244.8,209.41,192.26,216.45,203.24,231.21,218.91],"PKN":[81.68,73.64,74.8,73.02,72.18,57.2,68.24,66.28,62.38,63.56,60.6,63.14,63.93,65.94,51.77,64.12,73.99,77.82,94.39,120.5,141.76],"PM":[96.78,103.56,86.87,101.44,105.76,96.48,102.46,97.51,90.16,95.68,94.05,89.83,102.96,125.71,131.02,158.79,182.75,167.4,156.15,183.82,177.38],"PNDORA":[831.6,793.2,831.2,670.4,555,431.2,530.8,659.8,550.8,714.8,931.6,1147,1105,1174.5,1164,1244.5,1178.5,862,769,486.2,601],"PNR":[70.46,77.44,72.24,56.04,49.58,44.18,46.64,55.36,56.32,70.96,66.28,78.33,79.9,86.47,108.92,91.74,98.51,106.29,105.06,98.12,70.84],"PODD":[264.47,299.99,283.46,260.84,207.38,259.53,308,282.48,272.48,192.18,192.19,169.25,181.42,206.69,266.49,272.64,325,344.92,310.83,245.45,144.94],"PRY":[28.49,32.28,33.45,29.25,29.29,30.62,33.49,36.67,35.79,37.75,36.5,46.01,60.08,63.38,63.04,56.18,56.6,75.42,84.82,103.35,148],"PSX":[86.85,69.21,68.67,82.17,103.18,86.33,108.04,107.24,93.05,117.17,129.7,144.2,138.93,135,136.43,124.99,114.28,133.84,139.76,160.18,175.88],"PTC":[131.9,133.11,108.84,110.13,116.42,114.93,127.49,123.81,135.07,146.75,159.41,187.76,174.11,173.62,199.38,160.56,166.75,212.64,174.88,158.12,138.73],"PYPL":[259.27,286.75,179.32,106.51,82.48,92.66,78.53,73.82,63.05,63.57,59.65,60.54,63.46,72,86.53,69.75,70.93,69.25,62.58,45.63,44.75],"QCOM":[133.94,146.45,175.63,163.69,140.02,129.92,126.81,123.68,115.83,115.39,129.67,163.09,205.91,163.24,163.03,153.62,146.63,158.78,168.04,141.03,251.02],"QIA":[43.64,52.66,53.5,50.22,47.21,50.46,53.41,47.88,47.56,46.47,41.9,42.71,43.02,44.68,45.12,38.42,41.74,42.63,43.31,41.99,31.59],"RAA":[732.4,934.8,818.6,639,598,535,607.5,611,628,697.5,587.5,756.5,775.5,899.5,880,876,726,635.5,631,726.5,660.5],"RACE":[173.4,184.75,232.5,189.3,177.65,191.85,216.1,246.1,271.3,284.2,328.8,392.3,375.5,446,416.7,450.8,416.8,411.4,335.5,308.3,295.2],"REGN":[503.23,680.96,630.59,607.03,658.92,600.63,761.24,770.44,731.17,831.63,814.86,982.82,989.48,1168.81,762.34,684.87,490.81,577.9,750.11,790.81,614.78],"REL":[1847,2195,2345,2290,2207,2230,2334,2528,2542,2579,3048,3411,3422,3553,3748,3832,4004,3427,2998,2575,2450],"RHM":[85.34,81.32,79.62,161,192.8,148.8,190.7,247.2,239.2,248.8,280.9,432.9,534,529.2,628.4,1181,1857.5,1751.5,1444.5,1647.5,1292],"RIO":[90.8,74.91,62.16,80.03,73.23,54.34,69.18,72.71,61.04,63.85,71.16,65.14,69.42,60.34,63.27,61.05,59.58,61.89,71.97,99.61,106.39],"RJF":[88.71,93.37,94.91,102.68,97.74,104.56,117.41,106.82,91.14,106.41,107.92,120.07,120.93,119.28,166.95,150.4,145.42,168.32,155.83,154.42,143.41],"RMD":[206.25,288.07,253.29,251.15,202.71,219.48,229.34,214.11,218.69,159.19,159.64,174.61,207.39,244.9,244.92,233.1,244.03,270.99,248.38,257.39,190.57],"RMS":[1150,1270,1668.5,1198,1099,1250,1532.5,1711,1908.6,1885.8,1915.2,2308,2170,2163,2163,2735,2395,2063,2147,1967,1620],"R903":[39.98,39.98,39.98,39.98,39.98,39.98,39.98,39.98,39.98,39.98,39.98,39.98,39.98,39.98,39.98,39.98,39.66,31.94,28.16,26.23,28.7],"ROK":[267.89,323.02,332.01,262.12,217.01,241.77,266.75,292.65,280.47,314.05,281.47,289.05,257.96,261.48,297.12,278.63,317.28,337.84,389.96,412.15,451.06],"ROL":[33.76,38.92,31.94,33.16,34.99,34.16,40.39,34.55,40.22,39.37,40.91,44,46.04,50.49,49.86,53.01,58.58,56.67,61.18,60.88,47.6],"ROP":[448.42,483.24,459.58,446.26,430.83,405.15,444.73,421.2,452.8,499.54,540.58,547.96,536.16,552.36,568.63,585.81,566.69,518.99,443.58,353.93,325.53],"ROST":[122.97,117.53,104.87,89.55,82.66,88.51,117.98,110.67,100.9,121.7,132.14,149.63,141.22,151.68,156.36,136.81,142.42,151.25,177.5,202.3,231.73],"RRN":[108.94,114.94,126.14,92,88.73,71.31,86.93,148.42,146.4,219.1,276.7,374.8,460.9,464.3,573,776.8,868.8,1100,1037,1354,1337.4],"RXL":[16.92,17.55,16.92,19.01,19.88,15.78,17.7,23.82,19.37,21.58,22.39,23.69,27.77,23.08,24.06,26.1,24.14,27.72,32.6,36.27,36.81],"RYA":[17.09,16.08,14.91,13.94,13.92,12.16,13.03,14.99,16.71,16.14,18,19.93,18.13,15.73,18.8,20.96,23.75,25.12,28.08,26.99,25.13],"SAF":[124.44,108.24,103.12,103.7,96.63,99.47,116.54,133.96,137.5,146.06,163.14,193.44,215.4,197.2,221.8,257.9,261.8,285.6,286.1,336.1,305.7],"SAND":[213.48,209.29,220.61,185.45,193.49,158.45,193.45,217.8,194.15,208.4,209.7,233.6,225.4,216.3,206.3,233.2,207.7,239,286.5,392.2,376.5],"SAP":[114.48,126.98,115.44,98.05,94.11,83.48,106.46,106.4,123.18,127.86,147,173.38,168.88,199.5,230.5,266.95,265.15,233.5,208.35,168.02,156.02],"SAVE":[73.8,73.4,62.2,62.6,61.9,57.1,55.7,61.1,60,55.8,53.6,53.2,54.6,51,52,53.2,69.4,61.8,57.8,61.8,72.2],"SBUX":[113.34,117.45,108.66,90.14,76.28,85.4,103.37,101.43,97.52,98,99.2,93.16,82.08,93.18,101.51,115.41,85.19,89.78,84.91,96.76,99.16],"SCHW":[74.64,73.2,76.53,77.86,69.57,71.72,81.73,77.41,52.7,60.5,63.16,66.47,72.37,64.79,81.39,78.12,88.11,96.12,92.69,95.49,87.35],"SDZ":[29.5,29.5,29.5,29.5,29.5,29.5,29.5,29.5,29.5,29.5,25.69,27.95,31.09,36.75,38.9,39.75,41.78,50.2,56.74,67.6,65.6],"SGE":[654.2,747,783.4,716.4,653.6,698.2,811.6,751.6,869.4,970,1149,1244.5,1020,1020.5,1314.5,1285,1219,1086,1074,840,842.4],"SHEL":[39.59,39.6,41.59,51.77,59.73,52.4,58.05,61.94,57.09,62.85,65.43,63.56,70.81,69.38,64.34,66.46,67.45,73.79,74.31,84.22,84.12],"SHW":[282.84,305.91,330.95,255.53,265.26,232.33,251.61,219.01,234.89,274.82,282.33,335.23,302.03,363.75,395.58,356.73,355.44,360.92,341.49,356.1,303.84],"SIE":[135.18,139.1,145.08,119.74,123.46,100.4,133.4,145.62,157,138,156.04,180.58,177.8,170,186.96,223,215.25,238.25,226.35,238.3,269.3],"SIKAN":[291.8,328.9,364.4,303.4,259.2,212.2,245.6,261.5,248.8,247,236.8,258.3,270.9,272.8,232.3,231.8,216.6,185.25,157.15,157.4,153.3],"SKFB":[22.07,21.81,20.43,16.52,16.4,14.6,15.98,18.19,14.69,14.94,17.09,20.14,20.13,17.09,18.6,21.36,19.17,21.7,22.41,23.62,22.56],"SMCI":[3.52,3.75,4.24,3.99,5.17,6.33,9.05,10.2,23.1,28.22,26.96,90.55,77.06,44.18,42,36.07,41.2,40.78,33.41,31.83,46.09],"SMIN":[1563,1450,1470,1497,1561,1442.5,1595.5,1788.5,1611,1635,1659.5,1620.5,1733,1804,1766,2030,2166,2356,2434,2704,2464],"SNA":[255.64,224.93,202.77,202,216.96,215,242.14,247.29,252.67,270.52,279.86,277.3,268.87,279.56,366.88,334.08,316.49,323.45,338.47,389.59,371.21],"SNDK":[36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,50.31,37.33,51.07,210.17,619.08,1694.98],"SOBI":[137.4,183.11,215.87,186.16,205.65,222.55,216.54,229.62,202.5,211,250.6,260.8,283,315.8,305.4,320.8,305,283,341,388.6,442.2],"SOLV":[80,80,80,80,80,80,80,80,80,80,80,80,57.05,63.83,71.99,80.16,73.12,71.82,85.56,73,74.95],"SOON":[316.3,358.4,350.5,358.3,330.4,252.6,248.1,231.4,235.7,233.1,255.8,276.5,283,294.6,300.8,288.8,254.1,233,203.4,202,207.6],"SPIE":[19.87,20.5,22.38,20.78,22,21.5,23.88,26.02,28.02,27.78,27.26,30.8,38.06,36.38,29.26,34.88,44.5,46.98,47.4,52.1,48.9],"STE":[188.43,217.19,215.64,237.26,221.46,200.22,192.31,188.52,202.42,230.87,203.51,232.77,228.37,243.15,218.86,222.72,242.08,242.02,262.89,247.77,212.73],"STLD":[64.5,67.04,59.09,72.17,83.97,77.34,105.13,129.12,92.17,107.3,119.75,133.71,132.61,113.96,144.81,130.5,135.71,129.02,167.62,201.51,260.15],"STMMI":[37.44,44.66,49.48,40.45,39.5,34.75,38.75,48.97,44.95,47.02,47.84,47.17,41.97,29.59,26.12,24.23,25.05,26.27,23.16,33.48,69.31],"STMN":[142.05,179.45,199.3,146.1,115.85,104.55,108.65,123.95,135.1,133.85,119.85,142.75,115.55,123.7,114.75,123.5,104.25,94.98,93,89.68,94.72],"STX":[98.25,87.19,103.84,100.62,83.68,65.92,53.3,64.12,61.3,73.7,79.18,97.16,91.33,96.78,103.16,100.06,119.15,170.5,270.1,379.52,879.8],"SYK":[255.79,276.67,239.1,262.62,228,206.68,240.77,259.97,278.57,284.45,297.79,353.22,339.39,359.62,389.63,394.88,380.86,389.94,372.32,387.02,305.09],"SYY":[81.45,78.99,68.07,86.15,83.25,81.85,86.04,75.09,71.28,70.29,72.8,79.96,73.19,78.27,76.27,75.69,73.06,80.55,75.91,90.48,75.81],"TDG":[659.97,609.5,553.37,654.83,600.09,605.43,634.64,750.94,778.15,911.32,970.27,1183.27,1339.19,1332.49,1260.47,1370.82,1453.77,1304.88,1354.86,1316.26,1258.32],"TDY":[429.07,457.91,412.86,425.73,398.83,371.98,424.45,428.4,391.41,420.53,409.02,425,393.61,420,480.1,512.96,494.24,537.91,492.56,688.59,619.83],"TECH":[102.56,126.34,115.49,105.04,89.99,83.21,86.41,74.91,81.69,78.76,64.57,74.38,77.9,71.73,76.02,61.19,48.61,53.42,63.76,57.82,51.68],"TEL":[137.52,150.48,152.72,135.29,128.16,124.72,126.8,127.83,122.55,133.27,132,143.74,149.11,148.4,154.33,150.6,159.87,204.56,225.75,211.98,213.41],"1TER":[130.78,119.67,152.35,114.56,106.64,82.78,92.29,101.38,103.1,108.46,93.86,105.88,141.02,124.54,113.2,105.78,79.49,120.61,179.63,325.83,374.31],"TGT":[227.27,246.37,240.39,219.43,156.52,164.84,165.03,162.4,131.16,125.52,134.78,155.29,153.03,151.8,130.72,120.76,93.32,92.44,91.36,113.17,127.07],"TJX":[67.19,72.08,68.01,63.9,62.5,63.84,79.74,76.86,76.65,92.64,89.04,98.51,105.44,117.54,126.19,123.54,128.43,138.57,151.13,159.94,154.75],"TMO":[447.01,561.72,626.15,543.07,556.22,550.75,564.56,538.52,519.38,557.22,496.13,576.33,569.58,606.43,529.95,523.64,396.47,487.53,585.15,508.58,492.51],"TMUS":[141.7,137.74,106.72,123.13,134.56,143.92,151.81,141.29,138.91,137.33,152.25,163.37,173.08,200.53,244.82,272.83,243.06,255.89,206.63,216.11,187.53],"TPL":[166.56,150.54,131.17,133.97,177.54,198.86,284.26,199.48,147.7,212.04,194.03,173.97,198.6,271.68,500.12,452.13,370.05,314.11,284.58,531.09,393],"TPR":[44.97,40.54,38.88,38.81,34.14,34.91,38.48,43.25,39.73,33.7,32.7,47.22,44.28,41.57,64.58,84.09,78.56,102.79,112.1,156.42,145.46],"TPRO":[6.5,6.5,6.5,7.22,7.15,7.02,7.3,6.13,7.33,7.9,7.78,9.45,9.14,7.42,5.8,5.62,6.82,6.86,12.92,16.92,32.14],"TRGP":[39.88,43.79,50.85,65.55,75.07,67.64,74.95,76.29,68.8,87.53,90.16,99.34,116.53,149.88,194.54,195.68,162.35,166.72,176.68,239.61,255.07],"TROW":[191.12,221,196.03,139.56,123.89,119,127.09,111.13,108.38,112.9,102.45,113.48,116.83,104.48,123.64,103.88,92.15,105.6,101.59,94.92,104.53],"TSCO":[36.37,39.11,44.78,41.04,38.13,37.63,44.93,45.15,41.26,44.1,42.01,50.48,53.51,53.67,58.05,54.9,47.86,61.52,53.66,52.28,31.53],"TSM":[118.51,120.46,120.63,108.05,94.75,81.64,82.68,88.42,98.84,93.19,98.55,133.9,154.95,160.49,194.4,172.97,194.84,228.39,287.68,369.11,418.45],"TT":[187.54,197.88,185.44,152.06,136.34,156.82,178.18,185.66,165.91,205.23,227.53,285.98,321.5,346.18,414.79,346.24,430.36,410.93,410.16,466.17,451.3],"TTD":[58.31,79.51,95.22,82.08,51.56,61.89,51.91,55.41,73.26,79.93,71.6,83.89,93.11,100.97,135.16,67.17,74.77,54.18,39.58,24.32,21.56],"TTE":[47.76,44.03,46.38,49.29,58.23,49.89,61.7,62.19,57.59,63.88,67.37,64.5,71.13,66.88,56.48,59.83,60.51,62.59,65.63,81.07,87.32],"TXN":[189,188.35,191.76,167.29,174.42,166.16,177.5,172.17,175.81,169.83,155.21,171.05,193.72,201.83,201.78,194.39,184.21,199.81,168.16,209.82,305.68],"TYL":[402,487.38,501.87,422.33,345.87,366.99,352.23,320.1,398.98,396.66,413.73,440.9,474.19,578.72,625.58,606.39,564.72,552.49,465.55,354.62,313.15],"UBER":[50.98,40.62,36.02,33.89,22.94,28.92,28.34,32.99,38.48,47.04,57.35,81.03,63.79,71.89,73.07,74.44,83.64,92.81,86.57,75.95,70.4],"UCB":[34.72,30.06,33.98,36.98,31.22,32.6,38.68,33.04,23.33,27.59,26.23,25.65,25.51,30.14,33.77,32.02,28.4,33.1,30.96,32.51,32.95],"UHR":[330.7,262,277.8,262.5,244.9,227.7,252.7,332.1,260.6,251.3,230.8,211.9,193.7,176.8,159.2,174.4,137.85,142.75,165.25,183.95,216.2],"UHS":[160.53,155.45,116.39,144.88,120.75,97.25,130.2,132.08,131.14,134.57,137.7,171.12,186.6,236.47,201.06,175.8,187.38,181.51,239.43,206.42,146.11],"ULTA":[343.18,387.46,370.02,369.01,407.32,424.25,472.53,516.02,403.83,416.01,472.03,549.98,389.91,358.8,394.06,348.86,475.68,532.52,547.64,677,508.85],"ULVR":[4534.5,4324.88,4122.22,3940.95,3962.34,4148.42,4469.79,4424.88,4297.08,4308.84,4043.08,4136.66,4606.15,5257.45,5071.36,4854.26,4974.04,4987.95,4875.65,5326,4205.5],"UMG":[25.1,25.1,26.09,19.68,21,19.09,22.43,22.38,18.74,22.66,24.6,27.56,28.75,23.65,23.13,26.69,27.66,24.08,22.09,19,19.5],"UNH":[406.72,417.35,444.34,476.25,492.55,524,536.91,475.22,493.63,476.24,547.16,489.53,497.44,598.68,608.52,467.05,304.72,308.8,323.21,294.93,380.31],"UNP":[225.03,216.93,233.25,242.43,221.32,226.06,215.93,207.99,195.68,221.03,231.37,252.98,228.32,255.21,240.78,245.81,218.89,221.99,231.36,266.97,262.64],"URI":[339.45,347.33,332.82,313.04,293.5,288.69,356.42,467.8,339.29,491.17,501.83,700.59,637.51,701.85,857.05,617.52,691.15,958.77,805.24,820.58,995.67],"V":[226.63,230.12,190.16,208.97,209.93,200.13,217,218.36,226.5,248.11,256.45,283.16,270.38,278.54,316.65,361.82,365.32,350.07,330.39,320.51,326.36],"VACN":[281,388.6,443.6,347,279.2,228.4,264.8,285.6,372.5,355.1,403.8,447.7,469.4,440.5,346.3,348,310.6,268.6,364.7,537.2,610.8],"VEEV":[285.51,333.82,272.12,232.05,167.84,171.42,191.42,166.13,198.3,216.57,178.84,222.01,171.41,215.74,227.46,218.95,278.63,269.98,240.41,181.45,174.34],"VLO":[82.18,63.95,67.31,80.63,132.55,110.64,132.03,139.29,105.93,133.58,126.38,143.28,153.94,141.37,140.14,128.4,128.3,154.28,180.54,214.91,244.82],"VLTO":[77.8,77.8,77.8,77.8,77.8,77.8,77.8,77.8,77.8,77.8,76.51,86.76,98.92,110.26,106.63,99.87,100.28,105.28,100.97,97.22,82.23],"VMC":[183.62,185.85,188.98,174.44,164.54,166.22,183.83,179.97,198.8,222.92,215.63,267.43,252.19,239.02,287.05,239.77,263.38,292.49,291.85,306.2,282.92],"VOE":[37.98,37.8,30.46,28.88,26.9,19.83,26.1,35.04,28.9,27.68,26.58,25.48,26.4,22,18.18,23,22.72,28.68,37.74,46.3,48.4],"VOLV":[220.95,195.02,202.6,175.64,175.66,164.04,193.04,210.65,202.85,220,245.05,289.95,285.2,269.2,276.7,337.4,258.6,288.5,282.9,344.5,325.5],"VRSK":[171.18,203.06,219.64,179.36,171.23,188.9,186.14,176.72,219.97,242.84,242.73,241.65,253.75,274.36,292.7,301.33,316.99,265,224.01,214.79,174.99],"VRT":[24.92,28.36,24.7,12.59,10.34,11.49,14.2,16.13,19.4,39.87,45.14,70.57,96.11,75.2,127.05,85.41,109.23,124.01,179.22,257.75,315.71],"VRTX":[209.67,197.14,205,230.69,269.41,290.2,320.76,291.23,323.62,351.1,351.16,432.76,470.18,475.7,465.73,483.31,445.43,401,425.6,486.03,447.54],"VWS":[238.4,256.6,217.9,214.4,176.18,174.76,181.22,208.6,202.05,165.74,188.56,197.52,193.3,155.1,110.4,98,102.75,126.25,153.8,160.75,180.05],"WDC":[57.11,46.14,43.63,37.41,45.56,31.74,27.09,28.81,29.46,34.74,36.58,48.6,56.67,47.66,55.5,47.01,52.19,81.91,163.54,270.08,531.21],"WEIR":[1988,1731.5,1709,1520.5,1613,1394.5,1770,2018,1715.5,1841.5,1899.5,1852,2106,1982,2232,2464,2408,2466,2776,3508,2446],"WM":[140.07,155.85,160.51,146.58,158.53,170.04,167.82,148.83,162.8,157.01,173.8,205.79,201.3,209.4,225.12,233.78,242.1,225.73,215.93,243.07,211.46],"WMT":[47.22,49.26,45.71,45.33,41.82,44.83,51.12,46.72,49.14,53.86,51.45,58.76,65.82,77.17,92.64,97.59,99.77,97.85,111.53,127.1,115.75],"WRT1V":[11.25,12.1,12.59,9.67,7.9,7.84,8.28,9.29,10.73,11.81,12.82,14.48,19.33,19.95,17.27,17.89,17.56,25.06,27.72,35.95,34.64],"WSM":[85.47,91.63,93.35,73.36,62.51,73.46,58.36,61.76,56.97,72.25,97.93,118.32,148.84,131.12,177.38,187.69,158.22,191.96,182.44,201.34,203.57],"WST":[340.16,453.12,435.41,381.58,308.58,296.1,242.02,318.28,341.53,407.69,351.79,358.72,328.73,304.15,322.65,228.05,209.39,243.74,274.14,251.25,322.81],"XOM":[60.46,53.77,59.79,79.17,97.84,93.87,110.8,110.89,103.36,113.52,102.99,105.84,114.45,115.47,117.85,107.76,103.05,114.69,116.63,154.22,145.26],"XYL":[119.28,136.55,118.6,86.76,83.75,92.09,113.8,101.09,102.13,102.58,106.2,127.94,138.61,130.71,127.01,129.78,125.7,140.35,139.41,128.98,109.54],"XYZ":[221.95,268.25,194.5,126.06,81.91,68.75,69.17,76.63,61.5,58.17,65.04,79.25,64.3,64.17,92.78,62.79,61.76,76.23,64.35,64.45,75.72],"YAR":[453.5,433.5,447.2,453,486.6,415.4,449.7,491.8,412.7,387.6,362.6,342.3,325.8,307.1,310.9,317,371.7,364.8,372.5,486.7,502.8],"YUM":[119.9,131.55,123.22,120.02,119.42,114.26,129.19,126.2,132.25,129.64,127.33,137.42,139.33,133.48,139.03,156.93,144.63,145.44,150.64,162.92,147.95],"ZAB":[21.5,21.5,21.5,21.5,21.5,21.5,21.5,21.5,21.5,21.5,21.5,21.5,21.5,21.5,19.35,22.16,22.14,21.64,23.12,21.6,25.6],"ZAL":[90.72,94.08,78.46,53.52,35.52,22.48,31.05,37.89,26.69,28.92,22.43,19.78,24.39,22.8,29.94,35.06,32.31,23.86,23.48,19.89,23.38],"ZTS":[174.19,206.44,219.66,192.54,167.02,159.41,156.64,167.57,166,192.52,179.13,190.82,172.37,183.57,176.81,170.53,169.42,152.88,127.25,128.96,77.69]};


const SECTORS = [...new Set(STOCKS.map(s => s.sector))].sort();
const REGIONS = [...new Set(STOCKS.map(s => s.region))].sort();
const MCAP_BANDS = ["Mega (>$200B)", "Large ($10B-$200B)", "Mid ($2B-$10B)", "Small (<$2B)"];

const SECTOR_COLORS = {
  "Capital Goods & Industrial Machinery": "#8A3FFC", "Healthcare & Pharmaceuticals": "#34C77B",
  "Semiconductors & Tech Hardware": "#FF6159", "Software & IT Services": "#0F62FE",
  "Consumer Staples": "#D8BC7E", "Consumer Discretionary & Retail": "#B79BE0",
  "Financials": "#58F9CA", "Energy": "#FF832B", "Materials & Chemicals": "#E8B84B",
  "Internet, Media & Entertainment": "#C77D4A", "Aerospace & Defense": "#7C4DBA",
  "Automobiles & Components": "#A88BD9", "Industrials - Trading & Conglomerates": "#9A8DBA",
  "Telecom & Communication Services": "#4FA8D8", "Diversified / Other": "#6B5F8C",
  "Real Estate & Construction": "#C9A9E0", "Utilities": "#7ED9B5",
};
const fallbackColor = "#6B5F8C";

// Light/dark design tokens — Titan Wealth palette (from the official brand book + the
// Titan Intelligence demo's midnight execution). Only structural + semantic roles are themed;
// the categorical sector-fill colors above stay constant across themes since they're small
// decorative swatches, not text.
const THEMES = {
  dark: {
    bg: "#0B0618", surface: "#120A26", surface2: "#191036", surfaceAlt: "#221646",
    surfaceDeep: "#150829", surfaceDeepAlt: "#180938",
    border: "#241A3A", borderStrong: "#3A1B6E", borderMuted: "#2A1F52",
    text: "#F0EBFA", textStrong: "#FBFAFE", textSecondary: "#E8DEF5",
    muted: "#9A8DBA", faint: "#6B5F8C", placeholder: "#7A6F96",
    accent: "#8A3FFC", positive: "#34C77B", negative: "#FF6159",
    blueAccent: "#0F62FE", gold: "#D8BC7E", lavender: "#B79BE0",
    lockBorder: "#1B3B2C", staleBorder: "#3D3018", onAccent: "#0B0618",
    navBg: "rgba(11,6,24,.72)", gridLine: "rgba(183,155,224,.16)",
  },
  light: {
    bg: "#F5F2FA", surface: "#FFFFFF", surface2: "#F1EDF9", surfaceAlt: "#E8DEF5",
    surfaceDeep: "#F6F1FC", surfaceDeepAlt: "#EFE7FA",
    border: "#E0D5F0", borderStrong: "#C7B3E6", borderMuted: "#EAE1F6",
    text: "#241A3A", textStrong: "#150829", textSecondary: "#3A1A6C",
    muted: "#6B5F8C", faint: "#8A7FA0", placeholder: "#A79BC4",
    accent: "#6F30CF", positive: "#1E9E5C", negative: "#D93B30",
    blueAccent: "#0B4FD1", gold: "#8A6A2F", lavender: "#7C4DBA",
    lockBorder: "#BCE3CE", staleBorder: "#E8D9AE", onAccent: "#FFFFFF",
    navBg: "rgba(255,255,255,.72)", gridLine: "rgba(124,77,186,.14)",
  },
};
const equalSplit = (keys) => Object.fromEntries(keys.map(k => [k, Math.round((100 / keys.length) * 10) / 10]));

// 4 example portfolios, different niches — same config shape the AI box produces, so both share
// one apply function.
const EXAMPLE_PORTFOLIOS = [
  {
    name: "Global Quality Compounders",
    blurb: "Quality-first, low-volatility, long-horizon holdings across every region and sector.",
    config: {
      regions: [], sectors: [],
      qvgm: { Q: 60, V: 20, G: 15, M: 5 },
      sectorWeights: {}, locWeights: {},
      dividend: { enabled: false }, esg: { enabled: false },
    },
  },
  {
    name: "Asia-Pacific Tech & Industrials",
    blurb: "Growth/momentum tilt on semiconductor, industrial and auto names filtered to Asia-Pacific (mostly Japan in this dataset).",
    config: {
      regions: ["Asia-Pacific"],
      sectors: ["Semiconductors & Tech Hardware", "Capital Goods & Industrial Machinery", "Automobiles & Components"],
      qvgm: { Q: 20, V: 15, G: 30, M: 35 },
      sectorWeights: {}, locWeights: {},
      dividend: { enabled: false }, esg: { enabled: false },
    },
  },
  {
    name: "High-Dividend Defensive Value",
    blurb: "Value-tilted, high-yield holdings in defensive sectors, very low target volatility.",
    config: {
      regions: [],
      sectors: ["Consumer Staples", "Financials", "Telecom & Communication Services", "Healthcare & Pharmaceuticals"],
      qvgm: { Q: 30, V: 50, G: 10, M: 10 },
      sectorWeights: {}, locWeights: {},
      dividend: { enabled: true, min: 3 }, esg: { enabled: false },
    },
  },
  {
    name: "US Momentum Growth — Semis & Software",
    blurb: "Aggressive growth/momentum names in US semis, software and internet — higher volatility accepted.",
    config: {
      regions: ["North America"],
      sectors: ["Semiconductors & Tech Hardware", "Software & IT Services", "Internet, Media & Entertainment"],
      qvgm: { Q: 15, V: 10, G: 35, M: 40 },
      sectorWeights: {}, locWeights: {},
      dividend: { enabled: false }, esg: { enabled: false },
    },
  },
];

/* ============================== HELPERS ============================== */
function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// Generic "sum to 100" redistribution — used by QVGM, sector weights, location weights. Spreads
// the required change EVENLY across the other sliders (not proportionally to their current
// size), with water-filling so a slider pushed to 0 isn't permanently locked out of ever
// regaining share the next time you lower another slider.
function redistribute(current, key, rawVal, decimals = 0) {
  const mult = Math.pow(10, decimals);
  const newVal = Math.max(0, Math.min(100, rawVal));
  const keys = Object.keys(current);
  const others = keys.filter(k => k !== key);
  const remaining = 100 - newVal;

  let values = {};
  others.forEach(k => { values[k] = current[k]; });
  let need = remaining - others.reduce((a, k) => a + values[k], 0);
  let free = [...others];
  let guard = 0;
  while (Math.abs(need) > 1e-9 && free.length > 0 && guard < 20) {
    const share = need / free.length;
    const nextFree = [];
    let allocated = 0;
    for (const k of free) {
      const v = values[k] + share;
      if (v < 0) { allocated += (0 - values[k]); values[k] = 0; }
      else if (v > 100) { allocated += (100 - values[k]); values[k] = 100; }
      else { values[k] = v; allocated += share; nextFree.push(k); }
    }
    need -= allocated;
    free = nextFree;
    guard++;
  }

  const next = { [key]: Math.round(newVal * mult) / mult };
  others.forEach(k => { next[k] = Math.round(values[k] * mult) / mult; });

  // Rounding drift goes to whichever slider currently has the most room — never blindly to the
  // first "other" key, which is what let a value already at (or near) 0 get pushed negative.
  const drift = Math.round((100 - (next[key] + others.reduce((a, k) => a + next[k], 0))) * mult) / mult;
  if (drift !== 0) {
    const target = others.reduce((best, k) => (next[k] > next[best] ? k : best), others[0]);
    next[target] = Math.max(0, Math.min(100, Math.round((next[target] + drift) * mult) / mult));
  }
  return next;
}

// Normalize an arbitrary (possibly partial/invalid) weight object from the AI onto a fixed key set, summing to 100.
function normalizeWeights(obj, keys) {
  const vals = keys.map(k => {
    const v = obj && typeof obj[k] === "number" && obj[k] >= 0 ? obj[k] : 0;
    return v;
  });
  const sum = vals.reduce((a, b) => a + b, 0);
  if (sum <= 0) return equalSplit(keys);
  const out = {};
  keys.forEach((k, i) => { out[k] = Math.round((vals[i] / sum) * 1000) / 10; });
  const drift = Math.round((100 - Object.values(out).reduce((a, b) => a + b, 0)) * 10) / 10;
  out[keys[0]] += drift;
  return out;
}

// Minimum-weight allocator: every selected name gets >= floorPct, remainder distributed by score. Monotonic in score.
function applyMinWeight(items, floorPct = 1) {
  const n = items.length;
  if (n === 0) return items;
  if (n * floorPct >= 100) {
    const eq = 100 / n;
    return items.map(it => ({ ...it, weight: eq }));
  }
  const rawSum = items.reduce((a, it) => a + it.finalScore, 0) || 1;
  const remaining = 100 - n * floorPct;
  return items.map(it => ({ ...it, weight: floorPct + (it.finalScore / rawSum) * remaining }));
}

function stockKey(s) { return s.exch + ":" + s.ticker; }

// Turns the embedded quarterly price history into the same { rows, periodsPerYear, periodLabel }
// shape the upload handler produces, so the performance chart has real data immediately — no
// upload needed, since this data already lives in the app.
function buildBakedInHistorySheet() {
  if (typeof PRICE_HISTORY_DATES === "undefined" || PRICE_HISTORY_DATES.length < 2) return null;
  const rows = PRICE_HISTORY_DATES.map((dateStr, i) => {
    const prices = {};
    Object.keys(PRICE_HISTORY).forEach(ticker => {
      const v = PRICE_HISTORY[ticker][i];
      if (v != null) prices[ticker] = v;
    });
    return { date: new Date(dateStr + "T00:00:00Z"), prices };
  });
  const gaps = [];
  for (let i = 1; i < rows.length; i++) gaps.push((rows[i].date - rows[i - 1].date) / 86400000);
  const avgGapDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const periodsPerYear = Math.max(1, Math.round(365.25 / avgGapDays));
  const periodLabel = periodsPerYear === 4 ? "quarter" : periodsPerYear === 12 ? "month" : periodsPerYear === 1 ? "year" : periodsPerYear === 2 ? "half-year" : "period";
  return { rows, fileName: "Titan's price history", matchedCount: Object.keys(PRICE_HISTORY).length, totalCols: Object.keys(PRICE_HISTORY).length, periodsPerYear, periodLabel, builtIn: true };
}

// The automatic hard-filter + threshold predicate, shared by the engine and the universe browser
// so the "would this pass?" status shown there always matches what actually happens on Generate.
function passesFilters(s, p) {
  if (!p.regionFilter.has(s.region)) return false;
  if (!p.sectorFilter.has(s.sector)) return false;
  if (p.esgEnabled && s.esg < p.esgMin) return false;
  if (p.divEnabled && s.div < p.divMin) return false;
  return true;
}

/* ============================== CORE ENGINE ============================== */

// Builds a plain-English name and one-line description for the generated portfolio, the same way
// the example templates have a name + blurb. Purely rule-based from the active filters — no API
// call needed, so it's instant every time you generate.
function describePortfolio(p, stats) {
  const factorLabels = { Q: "Quality", V: "Value", G: "Growth", M: "Momentum" };
  const factorDescs = {
    Q: "financially strong, lower-risk companies",
    V: "shares that look undervalued relative to their fundamentals",
    G: "companies growing revenue and earnings quickly",
    M: "stocks that have been trending upward recently",
  };
  const vals = ["Q", "V", "G", "M"].map(k => p.qvgm[k]);
  const isFullyBalanced = (Math.max(...vals) - Math.min(...vals)) < 10;
  const sorted = ["Q", "V", "G", "M"].map(k => ({ k, val: p.qvgm[k] })).sort((a, b) => b.val - a.val);
  const top = sorted[0], second = sorted[1];
  const isTwoFactor = !isFullyBalanced && (top.val - second.val) < 15 && second.val >= 20;

  const equalSectorShare = 100 / SECTORS.length;
  const equalRegionShare = 100 / REGIONS.length;
  let sectorTiltName = null;
  if (p.sectorPrefEnabled) {
    const [sec, w] = Object.entries(p.sectorWeights).sort((a, b) => b[1] - a[1])[0];
    if (w > equalSectorShare * 1.5) sectorTiltName = sec;
  }
  let regionTiltName = null;
  if (p.locPrefEnabled) {
    const [reg, w] = Object.entries(p.locWeights).sort((a, b) => b[1] - a[1])[0];
    if (w > equalRegionShare * 1.5) regionTiltName = reg;
  }
  const singleRegion = p.regionFilter.size === 1 ? [...p.regionFilter][0] : null;
  const singleSector = p.sectorFilter.size === 1 ? [...p.sectorFilter][0] : null;
  const geoWord = regionTiltName || singleRegion;
  const sectorWord = sectorTiltName || singleSector;

  const factorPart = isFullyBalanced ? "Balanced" : isTwoFactor ? `${factorLabels[top.k]}-${factorLabels[second.k]}` : factorLabels[top.k];

  const nameBits = [];
  if (geoWord) nameBits.push(geoWord);
  if (sectorWord) nameBits.push(sectorWord);
  nameBits.push(factorPart);
  if (p.divEnabled) nameBits.push("Income");
  if (p.esgEnabled) nameBits.push("ESG");
  nameBits.push("Portfolio");
  const name = nameBits.join(" ");

  const styleSentence = isFullyBalanced
    ? "It weighs quality, value, growth and momentum roughly equally."
    : isTwoFactor
      ? `It blends ${factorDescs[top.k]} with ${factorDescs[second.k]}.`
      : `It's built around ${factorDescs[top.k]}.`;

  const extras = [];
  if (geoWord) extras.push(`a focus on ${geoWord}`);
  if (sectorWord && sectorWord !== geoWord) extras.push(`a lean toward the ${sectorWord} sector`);
  if (p.divEnabled) extras.push(`a minimum dividend yield of ${p.divMin}%`);
  if (p.esgEnabled) extras.push(`a minimum ESG score of ${p.esgMin}`);
  let extraSentence = "";
  if (extras.length) {
    const joined = extras.length === 1 ? extras[0] : extras.slice(0, -1).join(", ") + " and " + extras[extras.length - 1];
    extraSentence = ` With ${joined}.`;
  }

  const blurb = `A ${stats.count}-stock portfolio. ${styleSentence}${extraSentence}`;
  return { name, blurb };
}

function computePortfolio(p) {
  // 1. HARD FILTERS + opt-in HARD THRESHOLDS
  let universe = STOCKS.filter(s => passesFilters(s, p));

  // 2. QVGM weights (sliders already sum to 100, so this is just a 0-1 normalization)
  const adjW = { Q: p.qvgm.Q / 100, V: p.qvgm.V / 100, G: p.qvgm.G / 100, M: p.qvgm.M / 100 };

  const equalSectorShare = 100 / SECTORS.length;
  const equalRegionShare = 100 / REGIONS.length;

  // 3. SCORE EACH REMAINING STOCK
  let scored = universe.map(s => {
    const composite = adjW.Q * s.Q + adjW.V * s.V + adjW.G * s.G + adjW.M * s.M; // 0-100
    // Sector & location preference work like QVGM: relative weight vs. equal-share baseline.
    const sectorTilt = p.sectorPrefEnabled ? Math.max(0.02, p.sectorWeights[s.sector] / equalSectorShare) : 1;
    const locTilt = p.locPrefEnabled ? Math.max(0.02, p.locWeights[s.region] / equalRegionShare) : 1;

    const finalScore = (composite / 100) * sectorTilt * locTilt;
    return { ...s, composite, finalScore };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);

  // 4. SELECTION — not capped at a fixed count. We include every stock that scores at least half
  // as well as the best match (a genuine quality bar, not an arbitrary cutoff), with a floor of
  // 20 holdings for diversification even if fewer clear that bar, and a ceiling of 40 so the
  // portfolio never balloons to an unwieldy size. Only the top 10 by weight are ever shown to the
  // client in the holdings list, but the full portfolio drives the stats, allocation charts, and
  // the actual order ticket.
  const MIN_HOLDINGS = 20, MAX_HOLDINGS = 40;
  const topScore = scored.length ? scored[0].finalScore : 0;
  const qualityBar = topScore * 0.5;
  let selected = scored.filter(s => s.finalScore >= qualityBar);
  if (selected.length < MIN_HOLDINGS) selected = scored.slice(0, MIN_HOLDINGS);
  if (selected.length > MAX_HOLDINGS) selected = selected.slice(0, MAX_HOLDINGS);

  // 5. WEIGHTING — directly proportional to FinalScore (so rank order of weight == rank order of
  // score), with a hard 1% floor per holding. Not shown per-position in the UI, but still drives
  // the weighted portfolio-level stats below.
  selected = applyMinWeight(selected, 1);
  selected.sort((a, b) => b.weight - a.weight);

  // 6. PORTFOLIO STATS
  const wSumCheck = selected.reduce((a, s) => a + s.weight, 0) || 1;
  const wAvg = (key) => selected.reduce((a, s) => a + s[key] * s.weight, 0) / wSumCheck;
  const stats = selected.length ? {
    count: selected.length, avgVol: wAvg("vol"), avgDiv: wAvg("div"), avgESG: wAvg("esg"),
    avgComposite: wAvg("composite"), avgQ: wAvg("Q"), avgV: wAvg("V"), avgG: wAvg("G"), avgM: wAvg("M"),
  } : null;

  const sectorAlloc = {}, regionAlloc = {};
  selected.forEach(s => {
    sectorAlloc[s.sector] = (sectorAlloc[s.sector] || 0) + s.weight;
    regionAlloc[s.region] = (regionAlloc[s.region] || 0) + s.weight;
  });

  const meta = stats ? describePortfolio(p, stats) : null;
  return { universeSize: universe.length, selected, stats, sectorAlloc, regionAlloc, meta };
}

/* ============================== UI ATOMS ============================== */
function SectionLabel({ children, sub, t = THEMES.dark }) {
  return (
    <div style={{ marginBottom: 10, marginTop: 22 }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.12em", color: t.accent, textTransform: "uppercase" }}>{children}</div>
      {sub && <div style={{ fontSize: 12, color: t.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Chip({ active, onClick, children, t = THEMES.dark }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 11px", borderRadius: 999, border: `1px solid ${active ? t.accent : t.borderStrong}`,
      background: active ? "rgba(138,63,252,0.14)" : "transparent", color: active ? t.gold : t.muted,
      fontSize: 12, fontFamily: "'Jost', sans-serif", cursor: "pointer", marginRight: 6, marginBottom: 6,
      transition: "all 0.15s", whiteSpace: "nowrap",
    }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.textSecondary; } }}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = t.borderStrong; e.currentTarget.style.color = t.muted; } }}
    >{children}</button>
  );
}

function Toggle3({ value, options, onChange, t = THEMES.dark }) {
  return (
    <div style={{ display: "flex", background: t.surface2, borderRadius: 8, padding: 3, border: `1px solid ${t.borderMuted}` }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          flex: 1, padding: "6px 8px", borderRadius: 6, border: "none",
          background: value === opt ? t.accent : "transparent", color: value === opt ? t.onAccent : t.muted,
          fontSize: 12, fontWeight: value === opt ? 600 : 400, fontFamily: "'Jost', sans-serif", cursor: "pointer",
          transition: "all 0.15s",
        }}>{opt}</button>
      ))}
    </div>
  );
}

function Slider({ value, min, max, step = 1, onChange, unit = "", decimals = 0, t = THEMES.dark }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  const commit = () => {
    let v = parseFloat(text);
    if (isNaN(v)) { setText(String(value)); return; }
    v = Math.max(min, Math.min(max, v));
    onChange(v);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: t.accent, height: 4 }} />
      <input type="text" inputMode="decimal" value={text}
        onChange={e => setText(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") { commit(); e.target.blur(); } }}
        style={{
          width: decimals ? 50 : 42, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
          color: t.text, background: t.surface2, border: `1px solid ${t.borderStrong}`, borderRadius: 4, padding: "3px 5px",
        }} />
      {unit && <span style={{ fontSize: 11, color: t.faint, width: 12 }}>{unit}</span>}
    </div>
  );
}

function PrefRow({ label, enabled, onToggle, children, t = THEMES.dark }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: t.textSecondary }}>{label}</span>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <span style={{ fontSize: 10.5, color: enabled ? t.positive : t.faint, fontFamily: "'IBM Plex Mono', monospace" }}>
            {enabled ? "ACTIVE" : "NO PREFERENCE"}
          </span>
          <div onClick={onToggle} style={{
            width: 30, height: 17, borderRadius: 99, background: enabled ? t.positive : t.borderStrong,
            position: "relative", transition: "all 0.15s", flexShrink: 0,
          }}>
            <div style={{ width: 13, height: 13, borderRadius: "50%", background: t.surface, position: "absolute", top: 2, left: enabled ? 15 : 2, transition: "all 0.15s" }} />
          </div>
        </label>
      </div>
      {enabled && <div style={{ paddingLeft: 2 }}>{children}</div>}
    </div>
  );
}

function FactorBars({ Q, V, G, M, t = THEMES.dark }) {
  const items = [["Q", Q, t.accent], ["V", V, t.positive], ["G", G, t.lavender], ["M", M, t.blueAccent]];
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 22 }}>
      {items.map(([label, val, color]) => (
        <div key={label} title={`${label}: ${val}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14 }}>
          <div style={{ width: 8, height: 16, background: t.surfaceAlt, borderRadius: 2, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
            <div style={{ width: "100%", height: `${val}%`, background: color, borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Generic "sum to 100" weight group — used for sector weights and location weights.
function WeightGroup({ weights, onChange, colorFn, maxHeight, t = THEMES.dark }) {
  const sum = Math.round(Object.values(weights).reduce((a, b) => a + b, 0) * 10) / 10;
  return (
    <div>
      <div style={{ maxHeight: maxHeight || "none", overflowY: maxHeight ? "auto" : "visible", paddingRight: 4 }}>
        {Object.keys(weights).map(k => (
          <div key={k} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: colorFn ? colorFn(k) : t.textSecondary, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k}</div>
            <Slider t={t} value={weights[k]} min={0} max={100} step={0.5} decimals={1} unit="%"
              onChange={v => onChange(redistribute(weights, k, v, 1))} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: t.faint, marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>sum: {sum}%</div>
    </div>
  );
}

// Small pill reset button, reused across every filter card.
function ResetButton({ onClick, t = THEMES.dark, children = "Reset" }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: t.muted, background: "none",
      border: `1px solid ${t.borderStrong}`, borderRadius: 99, padding: "5px 12px", cursor: "pointer", fontFamily: "'Jost', sans-serif", transition: "all 0.2s",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.textSecondary; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = t.borderStrong; e.currentTarget.style.color = t.muted; }}
    >{children}</button>
  );
}

// A big, friendly filter card: heading + plain-English explanation of what the concept means,
// then the actual controls. Explanations describe what the filter represents, not how the
// underlying scoring formula works.
function FilterCard({ heading, description, children, t = THEMES.dark, wide }) {
  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
      padding: "22px 24px", gridColumn: wide ? "1 / -1" : "auto",
    }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: t.textStrong, marginBottom: 6 }}>{heading}</div>
      {description && <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.55, marginBottom: 16, maxWidth: 640 }}>{description}</div>}
      {children}
    </div>
  );
}

/* ============================== MAIN ============================== */
export default function PortfolioBuilder() {
  // Light/dark theme
  const [theme, setTheme] = useState("dark");
  const t = THEMES[theme];

  // Hard filters
  const [regionFilter, setRegionFilter] = useState(new Set(REGIONS));
  const [sectorFilter, setSectorFilter] = useState(new Set(SECTORS));

  // QVGM — sum to 100
  const [qvgm, setQvgm] = useState({ Q: 25, V: 25, G: 25, M: 25 });

  // Volatility band (soft fit)

  // Sector preference — now sum-to-100 like QVGM, one slider per sector
  const [sectorPrefEnabled, setSectorPrefEnabled] = useState(false);
  const [sectorWeights, setSectorWeights] = useState(equalSplit(SECTORS));

  // Location preference — now sum-to-100 like QVGM, one slider per region
  const [locPrefEnabled, setLocPrefEnabled] = useState(false);
  const [locWeights, setLocWeights] = useState(equalSplit(REGIONS));

  // Dividend / ESG — hard thresholds when enabled
  const [divEnabled, setDivEnabled] = useState(false);
  const [divMin, setDivMin] = useState(2.5);
  const [esgEnabled, setEsgEnabled] = useState(false);
  const [esgMin, setEsgMin] = useState(60);

  // Generation state — nothing computes until the button is pressed
  const [portfolio, setPortfolio] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isStale, setIsStale] = useState(false);

  // Describe-your-portfolio AI box
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Live market data (price / market cap / dividend yield) via web-search-backed API call
  const [liveData, setLiveData] = useState({}); // key -> { price, mcap, divYield, asOf }
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState(null);
  const [liveFetchedAt, setLiveFetchedAt] = useState(null);
  const [liveProgress, setLiveProgress] = useState(null); // { done, total }

  // Historical performance from a user-uploaded spreadsheet — real monthly prices, no web search
  // and no simulation. Expected format: first column = date, each other column = a company name
  // (matched against the current stock universe) with that period's price.
  const [historySheet, setHistorySheet] = useState(() => buildBakedInHistorySheet()); // { rows: [{date, prices}], fileName, ... } — starts pre-loaded with the built-in price history
  const [historyError, setHistoryError] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Lock & buy — prices holdings at current market prices via our backend
  // (which fetches Yahoo Finance quotes) and saves the resulting buy list into
  // today's shared order book. Still not a real trade — there is no brokerage
  // connection — but it's a persisted, server-side order ticket now instead of
  // a client-only one.
  const [portfolioValue, setPortfolioValue] = useState(10000);
  const [buyName, setBuyName] = useState("");
  const [lockedPortfolio, setLockedPortfolio] = useState(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState(null);

  // Keep the buy-name field prefilled with the generated portfolio's name, but
  // only until the person edits it themselves.
  const [buyNameTouched, setBuyNameTouched] = useState(false);
  useEffect(() => {
    if (!buyNameTouched && portfolio?.meta?.name) setBuyName(portfolio.meta.name);
  }, [portfolio, buyNameTouched]);

  // Today's combined order book — every portfolio anyone has bought today,
  // across the whole app, not just this browser tab.
  const [dailySummary, setDailySummary] = useState(null);
  const [dailySummaryLoading, setDailySummaryLoading] = useState(false);
  const [dailySummaryError, setDailySummaryError] = useState(null);
  const [downloadingDaily, setDownloadingDaily] = useState(false);

  const refreshDailySummary = async () => {
    setDailySummaryLoading(true); setDailySummaryError(null);
    try {
      setDailySummary(await getDailyOrdersSummary());
    } catch (err) {
      setDailySummaryError(err.message || "Couldn't load today's order summary.");
    } finally {
      setDailySummaryLoading(false);
    }
  };
  useEffect(() => { refreshDailySummary(); }, []);

  const handleDownloadDaily = async () => {
    setDownloadingDaily(true); setDailySummaryError(null);
    try {
      const blob = await downloadDailyOrdersFile(dailySummary?.tradeDate);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `combined_order_${dailySummary?.tradeDate || "today"}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setDailySummaryError(err.message || "Couldn't download the combined order sheet.");
    } finally {
      setDownloadingDaily(false);
    }
  };

  // Scroll to results after generating from the AI box or a template — those live at the top of
  // the page, far above where the results render, so without this the person wouldn't see anything happen.
  const resultsRef = useRef(null);
  const [pendingScroll, setPendingScroll] = useState(false);
  useEffect(() => {
    if (portfolio && pendingScroll) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingScroll(false);
    }
  }, [portfolio, pendingScroll]);


  const toggleSet = (setFn, set, val) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setFn(next);
  };

  const buildParams = () => ({
    regionFilter, sectorFilter,
    qvgm,
    sectorPrefEnabled, sectorWeights, locPrefEnabled, locWeights,
    divEnabled, divMin, esgEnabled, esgMin,
  });

  const generate = (paramsOverride) => {
    const res = computePortfolio(paramsOverride || buildParams());
    setPortfolio(res);
    setHasGenerated(true);
    setIsStale(false);
  };

  // Any change after a generation marks the result as stale — it does NOT auto-recompute.
  useEffect(() => {
    if (hasGenerated) setIsStale(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionFilter, sectorFilter, qvgm, sectorPrefEnabled, sectorWeights,
      locPrefEnabled, locWeights, divEnabled, divMin, esgEnabled, esgMin]);

  const applyAIConfig = (cfg) => {
    const newRegionFilter = new Set(Array.isArray(cfg.regions) && cfg.regions.length ? cfg.regions.filter(r => REGIONS.includes(r)) : REGIONS);
    const newSectorFilter = new Set(Array.isArray(cfg.sectors) && cfg.sectors.length ? cfg.sectors.filter(s => SECTORS.includes(s)) : SECTORS);
    const newQvgm = normalizeWeights(cfg.qvgm, ["Q", "V", "G", "M"]);
    const newSectorWeights = normalizeWeights(cfg.sectorWeights, SECTORS);
    const newSectorPrefEnabled = !!(cfg.sectorWeights && Object.keys(cfg.sectorWeights).length);
    const newLocWeights = normalizeWeights(cfg.locWeights, REGIONS);
    const newLocPrefEnabled = !!(cfg.locWeights && Object.keys(cfg.locWeights).length);
    const dv = cfg.dividend || {}, newDivEnabled = !!dv.enabled, newDivMin = typeof dv.min === "number" ? dv.min : 2.5;
    const eg = cfg.esg || {}, newEsgEnabled = !!eg.enabled, newEsgMin = typeof eg.min === "number" ? eg.min : 60;

    setRegionFilter(newRegionFilter); setSectorFilter(newSectorFilter);
    setQvgm(newQvgm);
    setSectorWeights(newSectorWeights); setSectorPrefEnabled(newSectorPrefEnabled);
    setLocWeights(newLocWeights); setLocPrefEnabled(newLocPrefEnabled);
    setDivEnabled(newDivEnabled); setDivMin(newDivMin);
    setEsgEnabled(newEsgEnabled); setEsgMin(newEsgMin);

    generate({
      regionFilter: newRegionFilter, sectorFilter: newSectorFilter,
      qvgm: newQvgm,
      sectorPrefEnabled: newSectorPrefEnabled, sectorWeights: newSectorWeights,
      locPrefEnabled: newLocPrefEnabled, locWeights: newLocWeights,
      divEnabled: newDivEnabled, divMin: newDivMin,
      esgEnabled: newEsgEnabled, esgMin: newEsgMin,
    });
  };

  const runAI = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true); setAiError(null);
    try {
      const cfg = await getAIPortfolioConfig({ prompt: aiPrompt, sectors: SECTORS, regions: REGIONS });
      setPendingScroll(true);
      applyAIConfig(cfg);
    } catch (err) {
      setAiError(err.message || "Couldn't turn that into a portfolio config — try rephrasing, or adjust the filters manually below.");
    } finally {
      setAiLoading(false);
    }
  };

  const selected = portfolio ? portfolio.selected : [];
  const topTen = selected.slice(0, 10);
  const stats = portfolio ? portfolio.stats : null;
  const sectorAlloc = portfolio ? portfolio.sectorAlloc : {};
  const regionAlloc = portfolio ? portfolio.regionAlloc : {};
  const universeSize = portfolio ? portfolio.universeSize : STOCKS.length;
  const maxSectorW = Math.max(...Object.values(sectorAlloc), 1);
  const maxRegionW = Math.max(...Object.values(regionAlloc), 1);

  // Historical performance from the uploaded spreadsheet, if there is one — a real month-by-month
  // series, not a two-point estimate. Only holdings present in EVERY row of the file are included,
  // so the line reflects a consistent basket throughout, and weights are renormalized among just
  // those holdings so the starting point is still a clean $10,000.
  const sheetPerf = useMemo(() => {
    if (!historySheet || selected.length === 0) return null;
    const rows = historySheet.rows;
    const withFullHistory = selected.filter(s => rows.every(r => r.prices[s.ticker] != null));
    if (withFullHistory.length === 0) return null;
    const wSum = withFullHistory.reduce((a, s) => a + s.weight, 0) || 1;
    const startRow = rows[0];
    const shares = {};
    withFullHistory.forEach(s => {
      const dollarsThen = (s.weight / wSum) * 10000;
      shares[s.ticker] = dollarsThen / startRow.prices[s.ticker];
    });
    const isQuarterly = historySheet.periodsPerYear === 4;
    const points = rows.map(r => {
      let val = 0;
      withFullHistory.forEach(s => { val += shares[s.ticker] * r.prices[s.ticker]; });
      const label = isQuarterly
        ? `Q${Math.floor(r.date.getMonth() / 3) + 1} '${String(r.date.getFullYear()).slice(2)}`
        : r.date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      return { label, value: Math.round(val) };
    });
    return { points, coveredCount: withFullHistory.length, totalCount: selected.length, periodCount: rows.length };
  }, [historySheet, selected]);
  const sheetStartVal = sheetPerf ? sheetPerf.points[0].value : 0;
  const sheetEndVal = sheetPerf ? sheetPerf.points[sheetPerf.points.length - 1].value : 0;
  const sheetTotalReturn = sheetPerf && sheetStartVal > 0 ? (sheetEndVal / sheetStartVal - 1) * 100 : 0;
  const sheetYears = sheetPerf && historySheet ? (sheetPerf.periodCount - 1) / historySheet.periodsPerYear : 0;
  const sheetCagr = sheetPerf && sheetYears > 0.08 && sheetStartVal > 0 ? (Math.pow(sheetEndVal / sheetStartVal, 1 / sheetYears) - 1) * 100 : sheetTotalReturn;

  const perfEligible = selected.filter(s => {
    const ld = liveData[stockKey(s)];
    return ld && ld.price != null && ld.price5yAgo != null;
  });
  const perfHasData = perfEligible.length > 0;
  const perfWSum = perfEligible.reduce((a, s) => a + s.weight, 0) || 1;
  let perfThen = 0, perfNow = 0;
  perfEligible.forEach(s => {
    const w = s.weight / perfWSum; // renormalized among just the holdings with real price history
    const ld = liveData[stockKey(s)];
    const dollarsThen = w * 10000;
    const shares = dollarsThen / ld.price5yAgo;
    perfThen += dollarsThen;
    perfNow += shares * ld.price;
  });
  const perfTotalReturn = perfThen > 0 ? (perfNow / perfThen - 1) * 100 : 0;
  const perfCagr = perfThen > 0 ? (Math.pow(perfNow / perfThen, 1 / 5) - 1) * 100 : 0;
  const perfChartData = perfHasData ? [
    { label: "5 years ago", value: Math.round(perfThen) },
    { label: "Today", value: Math.round(perfNow) },
  ] : [];

  // Pull real, current price / market cap / dividend yield for the top holdings by weight via a
  // web-search-backed API call. This is a live snapshot from the model's search results — not a
  // licensed tick-by-tick feed — so treat it as approximate and re-check before acting on it.
  // Batched in small groups: looking up many tickers with live search in one call reliably runs
  // out of output-token budget mid-search (search results themselves consume tokens) before the
  // model ever writes the final JSON. Batching in groups of 5 fixed that; there's no longer a
  // reason to cap the total — this now covers every current holding, batch by batch, with
  // progress shown since a large portfolio means several sequential API calls.
  // Parses an uploaded .xlsx/.xls/.csv of historical prices: first column = date (one row per
  // month), every other column header = a ticker with that month's closing price.
  // Matches spreadsheet columns to holdings by company name (this file's headers are full company
  // names, e.g. "OBAYASHI CORPORATION" — not ticker symbols), coerces prices that came through as
  // strings, and auto-detects the reporting period (quarterly, monthly, etc.) from the actual gaps
  // between dates rather than assuming one.
  const handleHistoryUpload = async (file) => {
    if (!file) return;
    setHistoryLoading(true); setHistoryError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
      if (!rows || rows.length < 3) {
        throw new Error("Couldn't find enough rows — expected a header row plus at least 2 periods of data.");
      }

      // Build company name -> ticker lookup from the current stock universe (case/whitespace-insensitive).
      const nameToTicker = {};
      STOCKS.forEach(s => { nameToTicker[s.name.trim().toUpperCase()] = s.ticker; });

      const header = rows[0].map(h => (h == null ? "" : String(h).trim()));
      const colTicker = header.slice(1).map(h => nameToTicker[h.toUpperCase()] || null);
      const matchedCount = colTicker.filter(Boolean).length;
      if (matchedCount === 0) {
        throw new Error("None of the column headers matched a company name in the current stock universe. Expected the first column to be dates and every other column header to be a company name.");
      }

      const parseNum = (v) => {
        if (typeof v === "number") return isFinite(v) ? v : null;
        if (typeof v === "string" && v.trim() !== "") { const f = parseFloat(v); return isNaN(f) ? null : f; }
        return null;
      };

      const parsedRows = [];
      for (const r of rows.slice(1)) {
        if (!r || r[0] == null) continue;
        let d = r[0];
        if (!(d instanceof Date)) {
          const asDate = new Date(d);
          if (isNaN(asDate)) continue;
          d = asDate;
        }
        const prices = {};
        colTicker.forEach((tk, i) => {
          if (!tk) return;
          const v = parseNum(r[i + 1]);
          if (v != null && v > 0) prices[tk] = v;
        });
        parsedRows.push({ date: d, prices });
      }
      parsedRows.sort((a, b) => a.date - b.date);
      if (parsedRows.length < 2) {
        throw new Error("Found fewer than 2 valid rows with a readable date and at least one matched price.");
      }

      // Auto-detect the reporting period from the actual date gaps (quarterly ≈ 91 days, monthly ≈ 30, etc.)
      const gaps = [];
      for (let i = 1; i < parsedRows.length; i++) gaps.push((parsedRows[i].date - parsedRows[i - 1].date) / 86400000);
      const avgGapDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const periodsPerYear = Math.max(1, Math.round(365.25 / avgGapDays));
      const periodLabel = periodsPerYear === 4 ? "quarter" : periodsPerYear === 12 ? "month" : periodsPerYear === 1 ? "year" : periodsPerYear === 2 ? "half-year" : "period";

      setHistorySheet({ rows: parsedRows, fileName: file.name, matchedCount, totalCols: header.length - 1, periodsPerYear, periodLabel });
    } catch (err) {
      setHistoryError(err.message || "Couldn't parse that file. Expected: first column = date, other columns = company name headers with a price per period.");
      setHistorySheet(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchLiveData = async () => {
    if (!portfolio || selected.length === 0 || liveLoading) return;
    setLiveLoading(true); setLiveError(null);

    const topN = selected; // all current holdings, not just the top slice
    const BATCH_SIZE = 5;
    const batches = [];
    for (let i = 0; i < topN.length; i += BATCH_SIZE) batches.push(topN.slice(i, i + BATCH_SIZE));
    setLiveProgress({ done: 0, total: topN.length });

    let anyOk = false;
    const errors = [];

    for (const batch of batches) {
      try {
        const list = batch.map(s => `${s.ticker} (${s.exch}) — ${s.name}`).join("\n");
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        const fiveYearsAgoLabel = fiveYearsAgo.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        const systemPrompt = `You are a market data lookup assistant. For each listed security, search the web for:
1. Its most recent trading price (convert to USD if quoted in another currency)
2. Its closing price as close as possible to ${fiveYearsAgoLabel} (nearest trading day if the market was closed) — this needs to be the ACTUAL historical closing price from a real source (e.g. a historical price chart or data table), not an estimate or a figure recalled from memory. If you cannot find a genuine sourced historical price, use null rather than guessing.
3. Current market capitalization in USD
4. Trailing twelve-month dividend yield

When you are done researching, respond with ONLY a raw JSON array as your final message — no markdown fences, no leading or trailing prose — one object per input line, in the same order:
[{"ticker":"...","priceUSD":number|null,"price5yAgoUSD":number|null,"marketCapUSD":number|null,"divYieldPct":number|null,"asOf":"short date or 'latest'"}]
Use null for any field you cannot find a reliable, genuinely sourced figure for — never guess or fabricate a number. Keep searches efficient — two or three queries per ticker should cover both the current and historical price.

Securities:
${list}`;
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 6144,
            system: systemPrompt,
            messages: [{ role: "user", content: "Look up current data for the securities listed in the system prompt and return the JSON array as your final message." }],
            tools: [{ type: "web_search_20250305", name: "web_search" }],
          }),
        });

        if (!resp.ok) {
          const errText = await resp.text().catch(() => "");
          throw new Error(`API returned ${resp.status}: ${errText.slice(0, 180) || "no error body"}`);
        }
        const data = await resp.json();
        if (data && data.type === "error") {
          throw new Error((data.error && data.error.message) || "Unknown API error");
        }
        if (data && data.stop_reason === "max_tokens") {
          throw new Error("Response was cut off before finishing (ran out of output budget) — try a smaller batch or fewer holdings.");
        }

        const textBlocks = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
        if (!textBlocks.trim()) throw new Error("Model returned no text output (search may have consumed the full response budget).");

        // Pull the JSON array out even if the model added stray words around it.
        const start = textBlocks.indexOf("[");
        const end = textBlocks.lastIndexOf("]");
        if (start === -1 || end === -1 || end < start) {
          throw new Error(`Couldn't find a JSON array in the response. Model said: "${textBlocks.slice(0, 160)}"`);
        }
        const arr = JSON.parse(textBlocks.slice(start, end + 1));

        const map = {};
        arr.forEach(item => {
          const match = batch.find(s => s.ticker === item.ticker);
          if (match) map[stockKey(match)] = { price: item.priceUSD, price5yAgo: item.price5yAgoUSD, mcap: item.marketCapUSD, divYield: item.divYieldPct, asOf: item.asOf };
        });
        setLiveData(prev => ({ ...prev, ...map }));
        anyOk = true;
      } catch (err) {
        errors.push(`[${batch.map(s => s.ticker).join(", ")}] ${err.message || String(err)}`);
      }
      setLiveProgress(prev => ({ done: (prev ? prev.done : 0) + batch.length, total: topN.length }));
    }

    setLiveFetchedAt(new Date().toLocaleString());
    setLiveProgress(null);
    if (errors.length) {
      setLiveError((anyOk ? "Some batches failed: " : "Failed: ") + errors.join(" · "));
    }
    setLiveLoading(false);
  };

  // "Lock & buy" — sends the current holdings + weights to our backend, which
  // fetches live Yahoo Finance prices, sizes the order, and SAVES it into
  // today's shared order book (every portfolio submitted today combines into
  // one bulk order at the next market open). Still not a real trade — no
  // brokerage connection — but now a persisted, server-side order ticket.
  const lockPortfolio = async () => {
    if (selected.length === 0 || buyLoading) return;
    setBuyLoading(true); setBuyError(null);
    try {
      const holdings = selected.map(s => ({
        ticker: s.ticker, exch: s.exch, name: s.name, sector: s.sector, country: s.country, weight: s.weight,
      }));
      const result = await submitBuy({
        portfolioName: buyName.trim() || "Untitled portfolio",
        dollarAmount: portfolioValue,
        holdings,
      });
      setLockedPortfolio({
        timestamp: new Date().toLocaleString(),
        portfolioValue: result.dollarAmount,
        holdings: result.holdings,
        totalAllocated: result.totalAllocated,
        cash: result.cash,
        skippedCount: result.skippedCount,
        id: result.id,
        tradeDate: result.tradeDate,
      });
      refreshDailySummary();
    } catch (err) {
      setBuyError(err.message || "Failed to price and save this order.");
    } finally {
      setBuyLoading(false);
    }
  };

  const exportCSV = () => {
    if (!lockedPortfolio) return;
    const header = "Ticker,Company,Sector,Region,Weight %,Live Price USD,Shares,Dollar Amount\n";
    const rows = lockedPortfolio.holdings.map(h =>
      `${h.ticker},"${h.name.replace(/"/g, '""')}",${h.sector},${h.country},${h.weight.toFixed(2)},${h.price.toFixed(2)},${h.shares.toFixed(4)},${h.amount.toFixed(2)}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `order_ticket_${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const GenerateButton = ({ big }) => (
    <button className="tw-btn-primary" onClick={() => generate()} style={{
      width: big ? "min(420px, 100%)" : "auto", padding: big ? "17px 26px" : "13px 26px", borderRadius: 99,
      border: `1px solid ${theme === "dark" ? "rgba(216,188,126,.4)" : "rgba(138,63,252,.35)"}`,
      background: `linear-gradient(135deg, ${t.lavender}, ${t.accent})`, color: "#FFFFFF", fontSize: big ? 15 : 13, fontWeight: 600, cursor: "pointer",
      fontFamily: "'Jost', sans-serif", letterSpacing: "0.12em", textTransform: "uppercase",
    }}>
      {hasGenerated ? "↻ Regenerate portfolio" : "▸ Generate my portfolio"}
    </button>
  );

  return (
    <div style={{ fontFamily: "'Jost', sans-serif", background: t.bg, color: t.text, minHeight: "100vh", fontSize: 14, transition: "background 0.25s, color 0.25s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; font-variant-numeric: tabular-nums; }
        input[type=range] { -webkit-appearance: none; background: transparent; }
        input[type=range]::-webkit-slider-runnable-track { height: 4px; background: ${t.borderStrong}; border-radius: 4px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%; background: ${t.accent}; margin-top: -4.5px; cursor: pointer; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${t.borderMuted}; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        textarea::placeholder { color: ${t.placeholder}; }
        .tw-btn-primary { transition: transform .2s, box-shadow .2s, filter .2s; }
        .tw-btn-primary:hover { filter: brightness(1.12); box-shadow: 0 10px 28px -10px rgba(138,63,252,0.55); transform: translateY(-1px); }
        .tw-card-hover { transition: transform .3s cubic-bezier(.2,.6,.2,1), border-color .3s, box-shadow .3s; }
        .tw-card-hover:hover { transform: translateY(-3px); box-shadow: 0 20px 50px -25px rgba(0,0,0,${theme === "dark" ? 0.6 : 0.18}); }
        .tw-blob { position: absolute; width: 46%; padding-bottom: 46%; border-radius: 50%; filter: blur(50px); opacity: ${theme === "dark" ? 0.5 : 0.35}; }
        .tw-blob-1 { top: -18%; left: -8%; animation: tw-drift-1 22s ease-in-out infinite alternate; }
        .tw-blob-2 { top: 10%; right: -12%; animation: tw-drift-2 26s ease-in-out infinite alternate; }
        .tw-blob-3 { bottom: -22%; left: 28%; animation: tw-drift-3 30s ease-in-out infinite alternate; }
        @keyframes tw-drift-1 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(6%,8%) scale(1.15); } }
        @keyframes tw-drift-2 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-8%,6%) scale(1.1); } }
        @keyframes tw-drift-3 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(4%,-6%) scale(1.2); } }
        @media (prefers-reduced-motion: reduce) { .tw-blob { animation: none !important; } }
      `}</style>

      {/* ============ TOP NAV ============ */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 14,
        padding: "12px 20px", background: t.navBg, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        borderBottom: `1px solid ${t.gridLine}`,
      }}>
        <svg width="30" height="30" viewBox="0 0 30 30" style={{ flexShrink: 0 }}>
          <circle cx="15" cy="15" r="13" fill={`url(#tw-roundel-${theme})`} stroke={t.accent} strokeWidth="1.4" />
          <defs>
            <radialGradient id={`tw-roundel-${theme}`} cx="32%" cy="28%" r="75%">
              <stop offset="0%" stopColor={theme === "dark" ? "#3A1B6E" : "#B79BE0"} />
              <stop offset="100%" stopColor={theme === "dark" ? "#31135E" : "#8A3FFC"} />
            </radialGradient>
          </defs>
          <text x="15" y="19.5" textAnchor="middle" fontFamily="'Cormorant Garamond', serif" fontSize="13" fill="#FBFAFE">T</text>
        </svg>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 600, letterSpacing: "0.3em", color: t.textStrong }}>TITAN</span>
          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 300, color: t.lavender }}>Wealth</span>
        </div>
        <div style={{ width: 1, height: 18, background: t.gridLine, margin: "0 2px" }} />
        <span style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: t.muted }}>Portfolio Screen</span>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", border: `1px solid ${t.gridLine}`, borderRadius: 99, padding: "5px 12px", color: t.lavender, whiteSpace: "nowrap" }}>
            Demo · Synthetic Data
          </span>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle light and dark mode"
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 99,
              border: `1px solid ${t.borderStrong}`, background: "transparent", color: t.textSecondary,
              fontSize: 11.5, letterSpacing: "0.06em", cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.background = "rgba(138,63,252,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = t.borderStrong; e.currentTarget.style.background = "transparent"; }}
          >
            {theme === "dark" ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.gold} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
                Light mode
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill={t.accent} stroke="none"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" /></svg>
                Dark mode
              </>
            )}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 28px 80px" }}>

        {/* ============ INTRO (moving gradient backdrop, inspired by the Titan Intelligence demo's silk hero) ============ */}
        <div style={{ position: "relative", textAlign: "center", marginBottom: 36, padding: "48px 20px", overflow: "hidden", borderRadius: 20 }}>
          <div className="tw-backdrop" aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden", borderRadius: 20 }}>
            <div className="tw-blob tw-blob-1" style={{ background: `radial-gradient(circle, ${t.accent}, transparent 70%)` }} />
            <div className="tw-blob tw-blob-2" style={{ background: `radial-gradient(circle, ${t.lavender}, transparent 70%)` }} />
            <div className="tw-blob tw-blob-3" style={{ background: `radial-gradient(circle, ${t.gold}, transparent 70%)` }} />
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 38, fontWeight: 600, color: t.textStrong, marginBottom: 10 }}>
              Build your portfolio
            </div>
            <div style={{ fontSize: 14.5, color: t.muted, maxWidth: 620, margin: "0 auto", lineHeight: 1.6 }}>
              Tell us what you're looking for and we'll screen {STOCKS.length} stocks to build you a fully diversified portfolio, then show you your top 10 holdings. Everything below is optional — skip anything you're not sure about.
            </div>
          </div>
        </div>

        {/* ============ AI DESCRIBE BOX ============ */}
        <div style={{ marginBottom: 24, padding: 24, background: t.surfaceDeep, border: `1px solid ${t.surfaceDeepAlt}`, borderRadius: 14 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: t.textStrong, marginBottom: 6 }}>
            ✦ Describe what you want
          </div>
          <div style={{ fontSize: 13, color: t.muted, marginBottom: 14 }}>Type it in plain English and we'll set everything up for you.</div>
          <textarea
            value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
            placeholder='e.g. "Low volatility, high quality, dividend-focused, Japan and Europe only"'
            rows={3}
            style={{ width: "100%", background: t.bg, color: t.text, border: `1px solid ${t.surfaceDeepAlt}`, borderRadius: 8, padding: "10px 12px", fontSize: 13.5, fontFamily: "'Jost', sans-serif", resize: "vertical" }}
          />
          <button className="tw-btn-primary" onClick={runAI} disabled={aiLoading || !aiPrompt.trim()} style={{
            marginTop: 10, padding: "11px 24px", borderRadius: 99, border: "none",
            background: aiLoading ? t.borderMuted : `linear-gradient(135deg, ${t.lavender}, ${t.accent})`, color: "#FFFFFF", fontSize: 12.5, fontWeight: 600,
            letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: aiLoading || !aiPrompt.trim() ? "default" : "pointer", opacity: !aiPrompt.trim() ? 0.5 : 1,
          }}>
            {aiLoading ? "Thinking…" : "Apply & generate"}
          </button>
          {aiError && <div style={{ fontSize: 12, color: t.negative, marginTop: 8 }}>{aiError}</div>}
        </div>

        {/* ============ EXAMPLE PORTFOLIOS ============ */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ textAlign: "center", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color: t.faint, marginBottom: 16 }}>— or start from a template —</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
            {EXAMPLE_PORTFOLIOS.map(ex => (
              <div key={ex.name} className="tw-card-hover" style={{ padding: 18, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)` }} />
                <div style={{ fontSize: 14.5, color: t.text, fontWeight: 600, marginBottom: 6 }}>{ex.name}</div>
                <div style={{ fontSize: 12.5, color: t.muted, lineHeight: 1.5, marginBottom: 12 }}>{ex.blurb}</div>
                <button onClick={() => { setPendingScroll(true); applyAIConfig(ex.config); }} style={{
                  fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "6px 14px", borderRadius: 99, border: `1px solid ${t.borderStrong}`,
                  background: "transparent", color: t.blueAccent, cursor: "pointer", fontFamily: "'Jost', sans-serif", transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(15,98,254,0.12)"; e.currentTarget.style.borderColor = t.blueAccent; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = t.borderStrong; }}
                >Use this</button>
              </div>
            ))}
          </div>
        </div>

        {/* ============ FILTERS ============ */}
        <div style={{ textAlign: "center", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color: t.faint, marginBottom: 20 }}>— or set your own filters —</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 20, marginBottom: 20 }}>
          <FilterCard t={t} heading="Geography" description="Only include companies headquartered in the regions you pick. Leave everything selected if location doesn't matter to you.">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, color: t.faint }}>{regionFilter.size}/{REGIONS.length} regions included</span>
              <ResetButton t={t} onClick={() => setRegionFilter(new Set(REGIONS))}>Reset</ResetButton>
            </div>
            <div>{REGIONS.map(r => <Chip t={t} key={r} active={regionFilter.has(r)} onClick={() => toggleSet(setRegionFilter, regionFilter, r)}>{r}</Chip>)}</div>
          </FilterCard>

          <FilterCard t={t} heading="Sector" description="Only include companies from the industries you pick — for example, just Technology and Healthcare, or everything except Energy.">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, color: t.faint }}>{sectorFilter.size}/{SECTORS.length} sectors included</span>
              <ResetButton t={t} onClick={() => setSectorFilter(new Set(SECTORS))}>Reset</ResetButton>
            </div>
            <div>{SECTORS.map(s => <Chip t={t} key={s} active={sectorFilter.has(s)} onClick={() => toggleSet(setSectorFilter, sectorFilter, s)}>{s}</Chip>)}</div>
          </FilterCard>
        </div>

        <div style={{ marginBottom: 20 }}>
          <FilterCard t={t} wide heading="What matters most to you" description="Rate how much each of these four things should count when we score a stock. Raising one lowers the others — they always add up to 100%.">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <ResetButton t={t} onClick={() => setQvgm({ Q: 25, V: 25, G: 25, M: 25 })}>Reset to equal</ResetButton>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: t.accent, marginBottom: 4 }}>Quality</div>
                <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.5, marginBottom: 8 }}>Shares of companies with strong fundamentals, consistent earnings growth, and sustainable competitive advantages. Typically shows up as high profitability, low debt, and steady cash flow — making these relatively lower-risk and attractive for long-term investors.</div>
                <Slider t={t} value={qvgm.Q} min={0} max={100} onChange={v => setQvgm(redistribute(qvgm, "Q", v))} unit="%" />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: t.positive, marginBottom: 4 }}>Value</div>
                <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.5, marginBottom: 8 }}>Shares that look cheap relative to the company's earnings, assets or cash flow. Usually identified by low price-to-earnings or price-to-book ratios — the idea that the market hasn't fully recognized what the business is really worth.</div>
                <Slider t={t} value={qvgm.V} min={0} max={100} onChange={v => setQvgm(redistribute(qvgm, "V", v))} unit="%" />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: t.lavender, marginBottom: 4 }}>Growth</div>
                <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.5, marginBottom: 8 }}>Shares of companies growing revenue and profits faster than their peers. Often trades at high price-to-earnings (P/E) ratios, since investors are paying a premium today for the growth they expect tomorrow.</div>
                <Slider t={t} value={qvgm.G} min={0} max={100} onChange={v => setQvgm(redistribute(qvgm, "G", v))} unit="%" />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: t.blueAccent, marginBottom: 4 }}>Momentum</div>
                <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.5, marginBottom: 8 }}>Shares that have been rising in price recently, on the idea that a stock already trending upward tends to keep moving that way for a while. Can mean more volatility, since the same trend has a habit of reversing quickly too.</div>
                <Slider t={t} value={qvgm.M} min={0} max={100} onChange={v => setQvgm(redistribute(qvgm, "M", v))} unit="%" />
              </div>
            </div>
            <div style={{ fontSize: 11, color: t.faint, marginTop: 14, fontFamily: "'IBM Plex Mono', monospace" }}>sum: {qvgm.Q + qvgm.V + qvgm.G + qvgm.M}%</div>
          </FilterCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 20, marginBottom: 20 }}>
          <FilterCard t={t} heading="Favor a sector" description="Lean your portfolio toward industries you have a view on, without fully excluding everything else the way the Sector filter above does.">
            <PrefRow t={t} label="Set a custom sector lean" enabled={sectorPrefEnabled} onToggle={() => setSectorPrefEnabled(!sectorPrefEnabled)}>
              <WeightGroup t={t} weights={sectorWeights} onChange={setSectorWeights} maxHeight={260} colorFn={k => SECTOR_COLORS[k] || fallbackColor} />
              <ResetButton t={t} onClick={() => { setSectorWeights(equalSplit(SECTORS)); setSectorPrefEnabled(false); }}>Reset</ResetButton>
            </PrefRow>
          </FilterCard>

          <FilterCard t={t} heading="Favor a region" description="Lean your portfolio toward parts of the world you want more exposure to, without fully excluding everywhere else.">
            <PrefRow t={t} label="Set a custom regional lean" enabled={locPrefEnabled} onToggle={() => setLocPrefEnabled(!locPrefEnabled)}>
              <WeightGroup t={t} weights={locWeights} onChange={setLocWeights} />
              <ResetButton t={t} onClick={() => { setLocWeights(equalSplit(REGIONS)); setLocPrefEnabled(false); }}>Reset</ResetButton>
            </PrefRow>
          </FilterCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 20, marginBottom: 36 }}>
          <FilterCard t={t} heading="Dividend income" description="Companies that regularly pay shareholders a portion of their profits in cash. Useful if you want your investments to generate income, not just grow in value over time.">
            <PrefRow t={t} label="Require a minimum yield" enabled={divEnabled} onToggle={() => setDivEnabled(!divEnabled)}>
              <Slider t={t} value={divMin} min={0} max={6} step={0.1} decimals={1} onChange={setDivMin} unit="%" />
              <div style={{ marginTop: 8 }}><ResetButton t={t} onClick={() => { setDivMin(2.5); setDivEnabled(false); }}>Reset</ResetButton></div>
            </PrefRow>
          </FilterCard>

          <FilterCard t={t} heading="Responsible investing (ESG)" description="A score for how responsibly a company is run — covering things like environmental impact, treatment of employees, and quality of leadership.">
            <PrefRow t={t} label="Require a minimum ESG score" enabled={esgEnabled} onToggle={() => setEsgEnabled(!esgEnabled)}>
              <Slider t={t} value={esgMin} min={0} max={100} onChange={setEsgMin} />
              <div style={{ marginTop: 8 }}><ResetButton t={t} onClick={() => { setEsgMin(60); setEsgEnabled(false); }}>Reset</ResetButton></div>
            </PrefRow>
          </FilterCard>
        </div>

        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11.5, color: t.faint }}>
            {portfolio ? universeSize : "—"} stocks currently eligible
          </div>
        </div>

        {/* ============ GENERATE (bottom of filters) ============ */}
        <div style={{ textAlign: "center", margin: "36px 0 44px" }}>
          <GenerateButton big />
        </div>

        {isStale && (
          <div style={{ background: "rgba(200,155,74,0.1)", border: `1px solid ${t.staleBorder}`, color: t.gold, fontSize: 12.5, padding: "9px 14px", borderRadius: 8, marginBottom: 20, textAlign: "center" }}>
            Filters changed since the last generation — click <b>Regenerate portfolio</b> above to refresh the results below.
          </div>
        )}

        {!portfolio && (
          <div style={{ textAlign: "center", color: t.faint, padding: "50px 20px", border: `1px dashed ${t.borderMuted}`, borderRadius: 12 }}>
            <div style={{ fontSize: 15, color: t.muted, marginBottom: 6 }}>Nothing generated yet</div>
            <div style={{ fontSize: 13 }}>Set your filters above — or describe what you want — then click <b style={{ color: t.accent }}>Generate my portfolio</b>.</div>
          </div>
        )}

        {portfolio && stats && (
          <div ref={resultsRef}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 600, color: t.textStrong, marginBottom: 8 }}>
                {portfolio.meta ? portfolio.meta.name : "Your portfolio"}
              </div>
              {portfolio.meta && <div style={{ fontSize: 14, color: t.muted, maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>{portfolio.meta.blurb}</div>}
            </div>

            <div style={{ marginBottom: 26 }}>
              <div style={{ fontSize: 11.5, color: t.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Portfolio value over time
              </div>
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 20 }}>
                {sheetPerf ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, color: t.textStrong }}>
                          ${sheetEndVal.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 12.5, color: sheetTotalReturn >= 0 ? t.positive : t.negative, marginTop: 2 }}>
                          {sheetTotalReturn >= 0 ? "+" : ""}{sheetTotalReturn.toFixed(1)}% total · {sheetCagr >= 0 ? "+" : ""}{sheetCagr.toFixed(1)}% per year · {sheetPerf.periodCount} {historySheet.periodLabel}s from {historySheet.fileName}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: t.faint, maxWidth: 340, textAlign: "right", lineHeight: 1.5 }}>
                        {historySheet.builtIn ? "From Titan's built-in price history" : "From your uploaded file"} — real prices, not simulated. Covers {sheetPerf.coveredCount} of {sheetPerf.totalCount} holdings
                        (only names present in every row are included). Past performance isn't a guide to future returns.
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={sheetPerf.points} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
                        <defs>
                          <linearGradient id="tw-perf-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={t.accent} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={t.accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={t.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" stroke={t.faint} fontSize={10.5} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(sheetPerf.points.length / 6) - 1)} />
                        <YAxis stroke={t.faint} fontSize={10.5} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={46} />
                        <Tooltip
                          contentStyle={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: t.textSecondary }} itemStyle={{ color: t.text }}
                          formatter={v => [`$${v.toLocaleString()}`, "Value"]}
                        />
                        <Area type="monotone" dataKey="value" stroke={t.accent} strokeWidth={2} fill="url(#tw-perf-gradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <label style={{
                        fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: t.muted, background: "none",
                        border: `1px solid ${t.borderStrong}`, borderRadius: 99, padding: "5px 12px", cursor: "pointer",
                      }}>
                        ↻ Use a different file instead
                        <input type="file" accept=".xlsx,.xls,.csv" onChange={e => handleHistoryUpload(e.target.files[0])} style={{ display: "none" }} />
                      </label>
                      {!historySheet.builtIn && (
                        <button onClick={() => { setHistorySheet(buildBakedInHistorySheet()); setHistoryError(null); }} style={{
                          fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: t.muted, background: "none",
                          border: `1px solid ${t.borderStrong}`, borderRadius: 99, padding: "5px 12px", cursor: "pointer",
                        }}>Reset to built-in data</button>
                      )}
                    </div>
                  </>
                ) : perfHasData ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, color: t.textStrong }}>
                          ${Math.round(perfNow).toLocaleString()}
                        </div>
                        <div style={{ fontSize: 12.5, color: perfTotalReturn >= 0 ? t.positive : t.negative, marginTop: 2 }}>
                          {perfTotalReturn >= 0 ? "+" : ""}{perfTotalReturn.toFixed(1)}% total · {perfCagr >= 0 ? "+" : ""}{perfCagr.toFixed(1)}% per year
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: t.faint, maxWidth: 340, textAlign: "right", lineHeight: 1.5 }}>
                        Based on real prices for {perfEligible.length} of {selected.length} holdings, via web search ({liveFetchedAt || "just now"}).
                        {perfEligible.length < selected.length && " Some holdings had no available 5-year price and were excluded, with the rest renormalized to still total $10,000 then."}
                        {" "}Past performance isn't a guide to future returns.
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={perfChartData} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
                        <CartesianGrid stroke={t.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" stroke={t.faint} fontSize={11.5} tickLine={false} axisLine={false} />
                        <YAxis stroke={t.faint} fontSize={10.5} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={46} />
                        <Tooltip
                          contentStyle={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: t.textSecondary }} itemStyle={{ color: t.text }}
                          formatter={v => [`$${v.toLocaleString()}`, "Value"]}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={90}>
                          {perfChartData.map((entry, i) => <Cell key={i} fill={i === 0 ? t.borderStrong : t.accent} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                      <button onClick={fetchLiveData} disabled={liveLoading} style={{
                        fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: t.muted, background: "none",
                        border: `1px solid ${t.borderStrong}`, borderRadius: 99, padding: "5px 12px", cursor: "pointer",
                      }}>{liveLoading ? "Refreshing…" : "↻ Refresh prices"}</button>
                      <label style={{
                        fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: t.muted, background: "none",
                        border: `1px solid ${t.borderStrong}`, borderRadius: 99, padding: "5px 12px", cursor: "pointer",
                      }}>
                        ⇪ Use my own spreadsheet instead
                        <input type="file" accept=".xlsx,.xls,.csv" onChange={e => handleHistoryUpload(e.target.files[0])} style={{ display: "none" }} />
                      </label>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <div style={{ fontSize: 13, color: t.muted, marginBottom: 16, maxWidth: 480, margin: "0 auto 16px" }}>
                      This uses real prices — never simulated. Upload a spreadsheet of monthly prices for a proper
                      month-by-month chart, or fetch a quick 5-years-ago-vs-today estimate via web search instead.
                    </div>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                      <label className="tw-btn-primary" style={{
                        padding: "10px 22px", borderRadius: 99, border: "none", cursor: "pointer",
                        background: `linear-gradient(135deg, ${t.lavender}, ${t.accent})`, color: "#FFFFFF", fontWeight: 600, fontSize: 12.5,
                        letterSpacing: "0.06em", textTransform: "uppercase",
                      }}>
                        {historyLoading ? "Reading file…" : "⇪ Upload monthly prices"}
                        <input type="file" accept=".xlsx,.xls,.csv" disabled={historyLoading} onChange={e => handleHistoryUpload(e.target.files[0])} style={{ display: "none" }} />
                      </label>
                      <button className="tw-btn-primary" onClick={fetchLiveData} disabled={liveLoading || selected.length === 0} style={{
                        padding: "10px 22px", borderRadius: 99, border: "none", cursor: liveLoading ? "default" : "pointer",
                        background: liveLoading ? t.borderStrong : `linear-gradient(135deg, ${t.blueAccent}, ${t.accent})`, color: "#FFFFFF", fontWeight: 600, fontSize: 12.5,
                        letterSpacing: "0.06em", textTransform: "uppercase",
                      }}>
                        {liveLoading ? "Fetching…" : "⛁ Fetch via web search"}
                      </button>
                    </div>
                    <div style={{ fontSize: 10.5, color: t.faint, marginTop: 12, maxWidth: 420, margin: "12px auto 0" }}>
                      Expected file format: first column = date, every other column header = a company name (matched against the current stock universe), with that period's price in the cells below it. Quarterly, monthly — whatever cadence your file uses, it's detected automatically.
                    </div>
                    {liveProgress && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ height: 5, background: t.surfaceAlt, borderRadius: 4, overflow: "hidden", width: 220, margin: "0 auto" }}>
                          <div style={{ width: `${(liveProgress.done / liveProgress.total) * 100}%`, height: "100%", background: t.blueAccent, borderRadius: 4, transition: "width 0.2s" }} />
                        </div>
                        <div style={{ fontSize: 10.5, color: t.faint, marginTop: 4 }}>{liveProgress.done} / {liveProgress.total} holdings fetched</div>
                      </div>
                    )}
                    {liveError && <div style={{ fontSize: 11.5, color: t.negative, marginTop: 10 }}>{liveError}</div>}
                    {historyError && <div style={{ fontSize: 11.5, color: t.negative, marginTop: 10 }}>{historyError}</div>}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24, marginTop: 18 }}>
              {[
                ["Portfolio holdings", stats.count, ""],
                ["Avg. dividend yield", stats.avgDiv.toFixed(2), "%"],
                ["Avg. ESG score", stats.avgESG.toFixed(1), "/100"],
                ["Stocks considered", universeSize, ""],
              ].map(([label, val, unit]) => (
                <div key={label} className="tw-card-hover" style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10.5, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 19, color: t.text }}>{val}<span style={{ fontSize: 12, color: t.faint }}>{unit}</span></div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20, marginBottom: 26 }}>
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11.5, color: t.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Sector allocation</div>
                {Object.entries(sectorAlloc).sort((a, b) => b[1] - a[1]).map(([sector, w]) => (
                  <div key={sector} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                      <span style={{ color: t.textSecondary }}>{sector}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: t.muted }}>{w.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 6, background: t.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${(w / maxSectorW) * 100}%`, height: "100%", background: SECTOR_COLORS[sector] || fallbackColor, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11.5, color: t.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Geographic allocation</div>
                {Object.entries(regionAlloc).sort((a, b) => b[1] - a[1]).map(([region, w]) => (
                  <div key={region} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                      <span style={{ color: t.textSecondary }}>{region}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: t.muted }}>{w.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 6, background: t.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${(w / maxRegionW) * 100}%`, height: "100%", background: t.accent, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 10.5, color: t.faint, marginTop: 14, lineHeight: 1.5 }}>
                  Factor legend: <span style={{ color: t.accent }}>■</span> Quality &nbsp;
                  <span style={{ color: t.positive }}>■</span> Value &nbsp;
                  <span style={{ color: t.lavender }}>■</span> Growth &nbsp;
                  <span style={{ color: t.blueAccent }}>■</span> Momentum
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: t.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Your top {topTen.length} holdings {selected.length > topTen.length && <span style={{ textTransform: "none", letterSpacing: 0 }}>(of {selected.length} in your full portfolio)</span>}
            </div>
            <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: t.surface2, textAlign: "left" }}>
                    {["Ticker", "Company", "Sector", "Region", "Div", "ESG"].map((h, i) => (
                      <th key={h} style={{ padding: "9px 12px", fontWeight: 500, color: t.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: i >= 4 ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topTen.map((s, i) => (
                    <tr key={s.exch + s.ticker} style={{ borderTop: `1px solid ${t.surfaceAlt}`, background: i % 2 === 0 ? "transparent" : t.surfaceDeep }}>
                      <td style={{ padding: "8px 12px", fontFamily: "'IBM Plex Mono', monospace", color: t.gold }}>{s.ticker}</td>
                      <td style={{ padding: "8px 12px", color: t.textSecondary, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</td>
                      <td style={{ padding: "8px 12px", color: t.muted, fontSize: 11.5 }}>{s.sector}</td>
                      <td style={{ padding: "8px 12px", color: t.muted, fontSize: 11.5 }}>{s.country}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: t.muted }}>{s.div.toFixed(1)}%</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: t.muted }}>{s.esg.toFixed(0)}</td>
                    </tr>
                  ))}
                  {topTen.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: t.faint }}>No stocks survive the current filters — widen your geography or sector selection, or relax the ESG/dividend thresholds.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11, color: t.faint, marginTop: 8 }}>
              We build a fully diversified {selected.length}-holding portfolio behind the scenes — the summary above and the ticket below reflect all {selected.length} holdings, we just keep the list you see short and readable.
            </div>

            {/* LIVE DATA & LOCK/BUY */}
            <div style={{ marginTop: 26 }}>
              <div style={{ fontSize: 11.5, color: t.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Live data & order ticket
              </div>
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.6, marginBottom: 12 }}>
                  Pulls current price, market cap and dividend yield for{" "}
                  <b style={{ color: t.textSecondary }}>all {selected.length} current holdings</b> via live web search, in batches
                  of 5 (each batch is its own API call, so a large portfolio takes longer and uses more requests).
                  QVGM, volatility, ESG and drawdown stay as the synthetic screening data above — there's no public real-time
                  feed for those factor ratings. This is a search-driven snapshot, not a licensed tick-by-tick market data
                  feed, so treat prices as approximate and re-check before acting on them.
                </div>
                <button className="tw-btn-primary" onClick={fetchLiveData} disabled={liveLoading || selected.length === 0} style={{
                  padding: "10px 20px", borderRadius: 99, border: "none", cursor: liveLoading ? "default" : "pointer",
                  background: liveLoading ? t.borderStrong : `linear-gradient(135deg, ${t.blueAccent}, ${t.accent})`, color: "#FFFFFF", fontWeight: 600, fontSize: 12,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                  {liveLoading ? "Fetching live data…" : Object.keys(liveData).length ? "↻ Refresh live data" : "⛁ Fetch live market data"}
                </button>
                {liveProgress && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 5, background: t.surfaceAlt, borderRadius: 4, overflow: "hidden", width: 220 }}>
                      <div style={{ width: `${(liveProgress.done / liveProgress.total) * 100}%`, height: "100%", background: t.blueAccent, borderRadius: 4, transition: "width 0.2s" }} />
                    </div>
                    <div style={{ fontSize: 10.5, color: t.faint, marginTop: 4 }}>{liveProgress.done} / {liveProgress.total} holdings fetched</div>
                  </div>
                )}
                {liveFetchedAt && <div style={{ fontSize: 11, color: t.faint, marginTop: 8 }}>Last updated {liveFetchedAt}</div>}
                {liveError && <div style={{ fontSize: 11.5, color: t.negative, marginTop: 8, lineHeight: 1.5, wordBreak: "break-word" }}>{liveError}</div>}

                {Object.keys(liveData).length > 0 && (
                  <>
                    <div style={{ marginTop: 16, borderTop: `1px solid ${t.border}`, paddingTop: 14 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr>
                          {["Ticker", "Live price", "Market cap", "Div. yield", "As of"].map((h, i) => (
                            <th key={h} style={{ padding: "4px 10px", fontWeight: 500, color: t.muted, fontSize: 10.5, textTransform: "uppercase", textAlign: i > 0 ? "right" : "left" }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {selected.map(s => {
                            const ld = liveData[stockKey(s)];
                            return (
                              <tr key={s.exch + s.ticker} style={{ borderTop: `1px solid ${t.surfaceAlt}` }}>
                                <td style={{ padding: "5px 10px", fontFamily: "'IBM Plex Mono', monospace", color: t.gold }}>{s.ticker}</td>
                                <td style={{ padding: "5px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{ld && ld.price != null ? `$${ld.price.toFixed(2)}` : "—"}</td>
                                <td style={{ padding: "5px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: t.muted }}>{ld && ld.mcap != null ? `$${(ld.mcap / 1e9).toFixed(1)}B` : "—"}</td>
                                <td style={{ padding: "5px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: t.muted }}>{ld && ld.divYield != null ? `${ld.divYield.toFixed(2)}%` : "—"}</td>
                                <td style={{ padding: "5px 10px", textAlign: "right", color: t.faint, fontSize: 11 }}>{ld ? ld.asOf : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginTop: 16, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.6, marginBottom: 12 }}>
                  Prices <b style={{ color: t.textSecondary }}>all {selected.length} current holdings</b> at current Yahoo Finance
                  quotes (delayed ~15 min, not tick-by-tick real-time) and saves the resulting buy list into{" "}
                  <b style={{ color: t.textSecondary }}>today's combined order book</b> — every portfolio anyone submits today is
                  merged into one bulk order for the next market open. This does not place any real trade — there is no
                  brokerage connection. Not financial advice.
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: t.muted }}>Portfolio name</span>
                  <input type="text" value={buyName}
                    onChange={e => { setBuyName(e.target.value); setBuyNameTouched(true); }}
                    placeholder="e.g. Client A - Quality Tilt"
                    style={{ width: 220, background: t.surface2, color: t.text, border: `1px solid ${t.borderStrong}`, borderRadius: 6, padding: "7px 9px", fontSize: 12.5 }} />
                  <span style={{ fontSize: 12, color: t.muted }}>Portfolio value</span>
                  <span style={{ fontSize: 12, color: t.faint }}>$</span>
                  <input type="number" value={portfolioValue} min={0}
                    onChange={e => setPortfolioValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    style={{ width: 120, background: t.surface2, color: t.text, border: `1px solid ${t.borderStrong}`, borderRadius: 6, padding: "7px 9px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 }} />
                  <button className="tw-btn-primary" onClick={lockPortfolio} disabled={buyLoading || selected.length === 0} style={{
                    padding: "10px 20px", borderRadius: 99, border: "none", cursor: buyLoading ? "default" : "pointer",
                    background: buyLoading ? t.borderStrong : `linear-gradient(135deg, ${t.positive}, #1a8f5c)`, color: "#FFFFFF",
                    fontWeight: 600, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>{buyLoading ? "Pricing & saving…" : "🔒 Buy — save to today's order book"}</button>
                </div>
                {buyError && <div style={{ fontSize: 11.5, color: t.negative, marginTop: 10, lineHeight: 1.5, wordBreak: "break-word" }}>{buyError}</div>}
              </div>

              {lockedPortfolio && (
                <div style={{ marginTop: 16, background: t.surface, border: `1px solid ${t.lockBorder}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, color: t.positive, fontWeight: 600 }}>✓ Saved to today's order book{lockedPortfolio.id ? ` (#${lockedPortfolio.id})` : ""}</div>
                      <div style={{ fontSize: 11, color: t.faint, marginTop: 2 }}>
                        Locked {lockedPortfolio.timestamp} · ${lockedPortfolio.portfolioValue.toLocaleString()} target · {lockedPortfolio.holdings.length} names
                        {lockedPortfolio.tradeDate ? ` · trade date ${lockedPortfolio.tradeDate}` : ""}
                        {lockedPortfolio.skippedCount ? ` · ${lockedPortfolio.skippedCount} holding(s) skipped (no live quote)` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={exportCSV} style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", padding: "7px 14px", borderRadius: 99, border: `1px solid ${t.borderStrong}`, background: "transparent", color: t.textSecondary, cursor: "pointer" }}>⬇ Export CSV</button>
                      <button onClick={() => setLockedPortfolio(null)} style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", padding: "7px 14px", borderRadius: 99, border: `1px solid ${t.borderStrong}`, background: "transparent", color: t.muted, cursor: "pointer" }}>Clear</button>
                    </div>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead><tr style={{ background: t.surface2 }}>
                      {["Ticker", "Company", "Weight", "Price", "Shares", "Amount"].map((h, i) => (
                        <th key={h} style={{ padding: "7px 10px", fontWeight: 500, color: t.muted, fontSize: 10.5, textTransform: "uppercase", textAlign: i >= 2 ? "right" : "left" }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {lockedPortfolio.holdings.map(h => (
                        <tr key={h.ticker} style={{ borderTop: `1px solid ${t.surfaceAlt}` }}>
                          <td style={{ padding: "6px 10px", fontFamily: "'IBM Plex Mono', monospace", color: t.gold }}>{h.ticker}</td>
                          <td style={{ padding: "6px 10px", color: t.textSecondary, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{h.weight.toFixed(2)}%</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>${h.price.toFixed(2)}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{h.shares.toFixed(3)}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>${h.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontSize: 10.5, color: t.faint, marginTop: 10 }}>
                    Allocated ${lockedPortfolio.totalAllocated.toFixed(2)} of ${lockedPortfolio.portfolioValue.toFixed(2)}{" "}
                    (${lockedPortfolio.cash.toFixed(2)} unallocated). Fractional shares shown — round to your broker's
                    supported precision. This is an order ticket for your own records, not an executed trade.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TODAY'S COMBINED ORDER BOOK — every portfolio anyone has bought today, across the whole app */}
        <div style={{ marginTop: 34 }}>
          <div style={{ fontSize: 11.5, color: t.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Today's combined order book
          </div>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.6, marginBottom: 12 }}>
              Every portfolio anyone buys today — from anyone using this app, not just this browser — nets into one
              bulk order sheet here, ready to place as a single order at the next market open.
            </div>
            {dailySummaryLoading && !dailySummary && <div style={{ fontSize: 12, color: t.faint }}>Loading…</div>}
            {dailySummaryError && <div style={{ fontSize: 11.5, color: t.negative, marginBottom: 10, lineHeight: 1.5, wordBreak: "break-word" }}>{dailySummaryError}</div>}
            {dailySummary && (
              <>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10.5, color: t.faint, textTransform: "uppercase" }}>Trade date</div>
                    <div style={{ fontSize: 15, fontFamily: "'IBM Plex Mono', monospace" }}>{dailySummary.tradeDate}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: t.faint, textTransform: "uppercase" }}>Portfolios submitted</div>
                    <div style={{ fontSize: 15, fontFamily: "'IBM Plex Mono', monospace" }}>{dailySummary.count}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: t.faint, textTransform: "uppercase" }}>Total $ across all</div>
                    <div style={{ fontSize: 15, fontFamily: "'IBM Plex Mono', monospace" }}>${dailySummary.totalDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                </div>
                {dailySummary.portfolios.length > 0 && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 14 }}>
                    <thead><tr>
                      {["Portfolio", "Submitted", "Amount", "Holdings"].map((h, i) => (
                        <th key={h} style={{ padding: "4px 10px", fontWeight: 500, color: t.muted, fontSize: 10.5, textTransform: "uppercase", textAlign: i >= 2 ? "right" : "left" }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {dailySummary.portfolios.map(p => (
                        <tr key={p.id} style={{ borderTop: `1px solid ${t.surfaceAlt}` }}>
                          <td style={{ padding: "5px 10px", color: t.textSecondary }}>{p.portfolioName}</td>
                          <td style={{ padding: "5px 10px", color: t.faint, fontSize: 11 }}>{new Date(p.createdAt).toLocaleString()}</td>
                          <td style={{ padding: "5px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>${p.dollarAmount.toLocaleString()}</td>
                          <td style={{ padding: "5px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{p.holdingCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={handleDownloadDaily} disabled={downloadingDaily || dailySummary.count === 0} className="tw-btn-primary" style={{
                    padding: "10px 20px", borderRadius: 99, border: "none", cursor: downloadingDaily || dailySummary.count === 0 ? "default" : "pointer",
                    background: dailySummary.count === 0 ? t.borderStrong : `linear-gradient(135deg, ${t.blueAccent}, ${t.accent})`, color: "#FFFFFF",
                    fontWeight: 600, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>{downloadingDaily ? "Downloading…" : "⬇ Download combined order (.xlsx)"}</button>
                  <button onClick={refreshDailySummary} disabled={dailySummaryLoading} style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", padding: "10px 16px", borderRadius: 99, border: `1px solid ${t.borderStrong}`, background: "transparent", color: t.muted, cursor: "pointer" }}>↻ Refresh</button>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ fontSize: 11, color: t.faint, marginTop: 14, marginBottom: 30 }}>
          Demo only — QVGM, dividend, and ESG figures are synthetic placeholder data generated for illustration, not real market data.
        </div>
      </div>
    </div>
  );
}
