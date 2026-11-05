# LIVE + SIMULATED TRADING PACK — pump.fun funded-dev books, 5 Nov 2026 12:20–17:23 UK

## What you are looking at
A bot buys brand-new pump.fun coins about 60–75 s after launch when they pass a 'funded dev' rule (creator wallet funded by a private wallet with few launches) and a buying bar. Several rule variants ('books') share the same coins. Exit: 40% trailing stop from the high (curve coins), 25% (graduated/PumpSwap coins), or 2 h time stop.
From 12:20 UK every entry is scored two ways: SIM = simulated executable fill (entry price from the bonding-curve/pool reserves 1 s after the rule fired; exit from the on-chain reserve stream, filled 0.7 s after the trail triggered; fees 0.0015 SOL; stake 0.02 SOL). LIVE = the FD book also bought and sold for real with 0.02 SOL through Jupiter. Live matches sim within ~4 points on 36 coins, so SIM is a trustworthy measure for every book.
r = net return (−0.80 = lost 80% of the stake). x = exit price / entry price. hi = highest price seen / entry. trig = price when the trail triggered; exit = price actually filled 0.7 s later.

## Per book (SIM, closed trades)
Per book, simulated executable fills since 12:20 UK (stake 0.02 SOL per trade; r = net return after fees)
A1     trades= 96 closed= 89 won= 12 (13%) avg r=-0.31 no-best=-0.36 net SOL=-0.546 reached2x=19 exit<0.35x=51 open=5 done-no-r=2
FDB    trades= 79 closed= 72 won=  9 (12%) avg r=-0.29 no-best=-0.35 net SOL=-0.417 reached2x=19 exit<0.35x=47 open=5 done-no-r=2
FDH    trades= 70 closed= 65 won=  9 (14%) avg r=-0.32 no-best=-0.38 net SOL=-0.410 reached2x=19 exit<0.35x=47 open=3 done-no-r=2
FDL    trades= 64 closed= 60 won=  8 (13%) avg r=-0.21 no-best=-0.31 net SOL=-0.254 reached2x=13 exit<0.35x=35 open=4 done-no-r=0
FD     trades= 55 closed= 51 won=  7 (14%) avg r=-0.21 no-best=-0.30 net SOL=-0.217 reached2x=13 exit<0.35x=31 open=4 done-no-r=0
FDF    trades= 43 closed= 39 won=  4 (10%) avg r=-0.29 no-best=-0.40 net SOL=-0.226 reached2x=8 exit<0.35x=25 open=4 done-no-r=0
FD35   trades= 38 closed= 38 won=  6 (16%) avg r=-0.19 no-best=-0.29 net SOL=-0.147 reached2x=12 exit<0.35x=21 open=0 done-no-r=0
FD120  trades= 27 closed= 27 won=  7 (26%) avg r=-0.15 no-best=-0.29 net SOL=-0.083 reached2x=10 exit<0.35x=17 open=0 done-no-r=0
FDHF   trades= 26 closed= 26 won=  2 (8%) avg r=-0.59 no-best=-0.69 net SOL=-0.305 reached2x=5 exit<0.35x=22 open=0 done-no-r=0
FDX    trades= 16 closed= 16 won=  2 (12%) avg r=-0.54 no-best=-0.70 net SOL=-0.174 reached2x=6 exit<0.35x=12 open=0 done-no-r=0

## Live FD (real money) vs its simulated twin
time  coin                     live buy  live x  live r   sim x   sim r  reason  buy ms  sell ms  note
09:43 The 10 Year Old Trencher 0.0219   0.957  -0.043   0.000  +0.000  trail      912     588  
12:23 Sam Apeman               0.0215   0.292  -0.708   0.709  -0.299  trail     1273     665  
12:30 Privacy Dog              0.0218   0.932  -0.068   0.296  -0.712  2h         695     833  entered after the dump
12:46 finance inu              0.0216   0.063  -0.937   0.069  -0.938  trail      949     511  
12:47 Chrome-Chan              0.0215   0.960  -0.040   0.953  -0.055  trail      838    1246  entered after the dump
12:58 memory coin              0.0218   3.231  +2.231   3.312  +2.305  trail      973     762  
13:00 Pillheads                0.0216   0.312  -0.688   0.262  -0.746  trail      985    1413  
13:04 Elon Musk                0.0217   0.752  -0.248   0.747  -0.260  trail      835    1246  
13:20 Community Coin           0.0217   0.942  -0.058   0.944  -0.063  2h         632     533  entered after the dump
13:22 Socialcoin               0.0215   0.211  -0.789   0.169  -0.839  trail      770     534  
13:25 The Ansem Collective     0.0217   0.302  -0.698   0.258  -0.750  trail      798     930  
13:29 This coin is from 2027   0.0218   3.446  +2.446   3.726  +2.718  trail      832     513  
13:46 Chrome-Chan              0.0215   0.212  -0.788   0.157  -0.851  trail      609     810  
13:53 MarsCoin                 0.0218   0.420  -0.580   0.377  -0.631  trail      683     742  
13:59 donuld tremp             0.0215   0.973  -0.027   0.964  -0.043  2h         966     968  entered after the dump
14:01 donuld tremp             0.0216   0.963  -0.037   0.955  -0.053  2h        1031     928  entered after the dump
14:09 Asdf                     0.0218   0.180  -0.820   0.129  -0.878  trail     1068     548  
14:10 titcoin                  0.0216   0.261  -0.740   0.213  -0.795  trail      662     825  
14:19 Whey Protein Coin        0.0217   0.303  -0.697   0.254  -0.753  trail      869     729  
14:21 Elon Mosque              0.0219   0.170  -0.830   0.118  -0.889  trail     1227     889  
14:24 fomo.gay                 0.0215   0.152  -0.848   0.091  -0.916  trail      817     829  
14:35 Spill The Tea            0.0215   0.961  -0.039   0.953  -0.055  2h         758     877  entered after the dump
14:37 Spill The Tea            0.0219   0.278  -0.722   0.230  -0.777  trail     1699     979  
14:40 the lame duck            0.0215   0.249  -0.751   0.220  -0.787  trail     1061     574  
14:46 MexicanAIPikachuConducto 0.0216   0.200  -0.800   0.142  -0.866  trail      994     760  
14:48 Magical Unicorn          0.0222   0.274  -0.726   0.223  -0.784  trail      846     773  
14:50 Squeeze                  0.0216   0.197  -0.803   0.140  -0.868  trail      820     743  
14:56 Velum Agent              0.0216   0.319  -0.681   0.215  -0.792  trail     1908    1329  
14:57 Elon                     0.0219   0.304  -0.696   0.254  -0.754  trail      835     755  
15:01 CATFISH                  0.0215   0.630  -0.370   0.587  -0.420  trail      859     515  
15:08 United States of Paranol 0.0218   0.170  -0.830   0.186  -0.821  trail      723     761  
15:14 Unstoppable Internet Mon 0.0217   0.957  -0.043   0.954  -0.053  2h         624     778  entered after the dump
15:26 regular inu              0.0217   2.827  +1.827   3.027  +2.019  trail      944     796  
16:56 Gay And Poor             0.0215   0.000  +0.000   0.000  +0.000             865       -  OPEN
16:59 Gay And Poor 500         0.0215   0.000  +0.000   0.000  +0.000             979       -  OPEN
17:00 Lock Inu                 0.0216   0.228  -0.772   0.167  -0.841  trail      896     766  
17:04 TOYODA                   0.0220   2.060  +1.060   2.203  +1.196  trail      708     557  
17:05 relax                    0.0216   0.149  -0.851   0.085  -0.922  trail      899     573  
17:07 Believe                  0.0217   0.000  +0.000   0.000  +0.000             876       -  OPEN
17:23 Waste Management         0.0215   0.325  -0.675   0.275  -0.732  trail      987     512  

live: in 0.867 out 0.568 net -0.299 SOL
live x minus sim x on the same coin: n 36 median 0.044 quartiles [0.003, 0.044, 0.051]

## Exit and timing facts (SIM, first entry per coin)
closed entries 134 corpse (price already fallen >50% before fill) 17 avg r -0.13
first entry per coin: n=84 won=13 avg r=-0.323 rug<0.35=54
re-entries (same coin again): n=33 won=10 avg r=+0.035 rug<0.35=21
trail exits 112 fill/trigger ratio quartiles [0.22, 0.41, 0.97]
rugs: hold seconds quartiles [28, 75, 184] share triggered within 60 s of entry 0.45 within 180 s 0.75
rugs: hi quartiles [1.08, 1.3, 1.81] rugs that reached 1.3x 37 1.5x 26 2x 14

Alternative exits on first entries (n=84), stake 0.02:
  as traded (40% trail)         avg r -0.323  net -0.542 SOL
  sell all at 1.3x else trail   avg r -0.222  net -0.373 SOL  hit 41
  sell all at 1.5x else trail   avg r -0.242  net -0.407 SOL  hit 32
  sell all at 2.0x else trail   avg r -0.283  net -0.476 SOL  hit 19
  sell all at 3.0x else trail   avg r -0.220  net -0.370 SOL  hit 13
  sell half at 1.5x, trail rest  avg r -0.282  net -0.475 SOL
  sell half at 2.0x, trail rest  avg r -0.303  net -0.509 SOL

## Launch-template grouping (first entries)
A: bundle 43-50% over 5 slot-0 wallets, ~24 SOL in, dev buy ~1 SOL | B: bundle 0%, 11 slot-0 wallets, top-3 buyers <45% | C: bundle 43-47%, 9-12 slot-0 wallets | D: bundle 65-79% (85-SOL launch tool, graduated) | E: other graduated >$90K | F: everything else
A: bundle 43-50%, 5 slot-0 wallets, ~24 SOL, dev ~1 SOL n=29  WIN=2 MID=5 RUG=22   winners: memory, This
B: bundle 0%, 11 slot-0 wallets, top-3 <45%             n= 6  WIN=0 MID=0 RUG=6   winners: 
C: bundle 43-47%, 9-12 slot-0 wallets, top-3 <50%       n=14  WIN=3 MID=1 RUG=10   winners: Elon, regular, TOYODA
D: bundle 65-79% (85-SOL tool), pool                    n= 8  WIN=1 MID=4 RUG=3   winners: Socialcoin
E: other pool entries >$90K                             n= 6  WIN=0 MID=4 RUG=2   winners: 
F: other                                                n=21  WIN=4 MID=6 RUG=11   winners: Sol, Deadpool, titcoin, The
A n=29 won=6 avg r=-0.321 net@0.02=-0.186
B n= 6 won=0 avg r=-0.821 net@0.02=-0.099
C n=14 won=3 avg r=-0.312 net@0.02=-0.087
D n= 8 won=3 avg r=-0.224 net@0.02=-0.036
E n= 6 won=0 avg r=-0.603 net@0.02=-0.072
F n=21 won=5 avg r=-0.072 net@0.02=-0.030
all first entries net -0.511

## Coin by coin — every simulated entry (141), with entry-time features
Columns: time UK | name | venue | books that entered | entry_gap (reserve price at fill vs price the rule saw; −0.8 = coin had already dumped 80% before we filled) | hi | trig | exit | r | reason | hold_s | bundle% | funder_sol | funder_launches | dev_buy_sol | gmgn_holders | mc_$k | age_s at entry | slot0_buyers | distinct_buyers | buy_sol_pre | top3_share | gmgn_buys | gmgn_sells | socials

time|name|venue|books|entry_gap|hi|trig|exit|r|reason|hold_s|bundle|funder_sol|funder_launches|dev_buy|holders|mc_k|age_s|slot0|buyers|buy_sol|top3|g_buys|g_sells|socials
12:20|Maybe, Higher?|pool|FDB,A1,FDH||||||||0.0|9.3|0|0.00|231|9.8|66|5|19|23.9|0.70|229|58|
12:23|Sam Apeman|curve|FD,FDL,FDB,A1,FDH|0.04|1.29||0.709|-0.30|trail|31|49.7|12.3|0|1.07|227|11.0|67|7|14|26.6|0.78|241|61|
12:24|Sam Apeman|curve|FD,FDL,FDB,A1,FDH,FD35|-0.81|1.00|0.93|0.931|-0.08|2h|7214|49.7|12.3|0|1.07|31|14.6|67|7|14|26.6|0.78|241|61|
12:28|United States of Elon|curve|FDL|0.14|1.00||0.574|-0.43|trail|1|49.5|21.2|0|0.90|235|7.7|71|5|18|31.2|0.65|228|59|
12:30|Privacy Dog|curve|FD,FDF,FDL,FDB,A1,FDH,FDHF|0.19|1.00||0.296|-0.71|trail||44.1|24.1|0|1.37|264|11.0|69|5|23|24.9|0.65|259|52|
12:32|Chiplon Musk|curve|FDL|-0.00|1.00||0.571|-0.44|trail|4|44.9|27.1|0|1.30|209|9.0|72|7|19|22.8|0.75|243|82|
12:34|fomo.gay|curve|FD,FDL,FDB,A1,FD35,FDH|-0.85|1.00|0.95|0.954|-0.05|2h|7207|48.9|3.0|0|0.99|158|18.0|71|5|7|25.2|0.81|258|59|
12:35|Cristiano Ronaldo|pool|FDB,A1,FDH||||||||0.0|828.9|0|0.00|143|104.2|64|8|26|145.7|0.80|412|297|
12:36|fomo.gay|curve|FDB,A1,FDH|0.04|1.34|0.38|0.101|-0.91|trail|242|0.0|7.5|0|0.00|429|26.3|68|5|10|25.3|0.78|344|89|
12:37|STEPSISTER|curve|FDL|-0.03|1.00|0.58|0.338|-0.67|trail|47|42.9|5.0|0|0.89|182|8.1|74|5|16|23.4|0.67|127|69|
12:41|Catecoin|pool|FDB,A1,FDH|0.02|4.39|0.02|0.022|-0.98|trail|4346|0.0|16.8|0|0.00|1842|105.4|69|9|17|145.3|0.80|319|181|
12:43|Official Barron Trump|pool|A1|-0.01|1.25|0.01|0.014|-0.99|trail|742|79.3|50.0|0|0.01|217|121.4|64|11|29|147.0|0.79|214|3|
12:46|finance inu|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF|0.39|3.69|0.07|0.069|-0.94|trail|1115|26.3|23.2|0|0.80|424|21.2|71|5|28|11.7|0.62|398|130|
12:47|finance inu|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF,FDX,FD120|0.01|3.16|0.06|0.059|-0.95|trail|1059|26.3|23.2|0|0.80|489|34.2|71|5|28|11.7|0.62|398|130|
12:47|Chrome-Chan|curve|FD,FDF,FDL,FDB,A1,FD35|-0.78|1.00|0.95|0.953|-0.06|2h|7201|49.1|16.7|0|1.01|12|12.8|70|5|7|25.3|0.82|212|72|
12:49|Ballsack Coin|curve|FDL|0.02|1.13|0.41|0.378|-0.63|trail|51|35.3|1601.5|0|14.72|20|7.5|65|1|4|15.4|0.99|28|39|
12:54|Cristiano Ronaldo|pool|FDB,A1,FDH|0.02|1.09|0.02|0.015|-0.99|trail|493|79.3|826.0|0|0.05|134|110.3|78|9|16|145.3|0.80|403|299|
12:57|community coins|curve|FDB,A1,FDH,FDHF|0.04|1.00|0.50|0.110|-0.90|trail|17|0.0|41.8|0|0.00|445|23.8|78|6|6|26.0|0.80|310|62|
12:58|Sol Village|curve|FDL|0.02|1.84|1.60|1.604|0.60|2h|7204|22.9|2.5|0|2.22|58|9.0|72|2|40|36.8|0.30|114|61|
12:58|memory coin|curve|FD,FDF,FDL,FDB,A1,FDH|0.01|5.61|3.33|3.312|2.30|trail|688|44.3|34.0|0|1.15|56|10.2|64|5|13|23.8|0.71|87|27|
12:59|memory coin|curve|FD,FDF,FDL,FDB,A1,FDH,FD120,FDHF|0.02|5.20|3.09|3.071|2.06|trail|624|44.3|34.0|0|1.15|275|10.9|64|5|13|23.8|0.71|87|27|
13:00|Pillheads|curve|FDL|0.17|1.66|0.78|0.261|-0.75|trail|184|29.0|14.6|0|0.91|125|9.1|78|5|22|20.1|0.42|163|131|
13:00|Pillheads|curve|FDL,FD,FDB,A1,FDH|-0.09|1.67|0.79|0.262|-0.75|trail|156|29.0|14.6|0|0.91|166|11.6|78|5|22|20.1|0.42|163|131|
13:00|Elon Mosque|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF|0.25|1.10|0.51|0.102|-0.91|trail|30|49.3|46.6|0|1.00|427|21.3|73|5|10|32.6|0.63|304|73|
13:01|Pillheads|curve|FDL,FD,FDB,A1,FDH,FD35,FD120|-0.11|1.50|0.71|0.235|-0.77|trail|136|29.0|14.6|0|0.91|186|13.2|78|5|22|20.1|0.42|163|131|
13:04|Elon Musk|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF|0.05|1.93|1.11|0.747|-0.26|trail|304|49.2|54.2|0|1.01|333|22.6|65|5|12|28.8|0.67|279|54|
13:04|finance inu|pool|FDB,A1,FDH|0.03|1.00|0.75|0.748|-0.26|trail|152|79.3|56.7|0|85.01|43|45.6|69|4|20|97.3|0.94|41|12|
13:05|Elon Musk|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF,FDX,FD120|0.01|1.55|0.89|0.602|-0.41|trail|238|49.2|54.2|0|1.01|567|29.3|65|5|12|28.8|0.67|279|54|
13:08|Deadpool Pony|curve|FDL|0.11|10.55|6.33|6.404|5.40|trail|1454|32.7|17.0|0|0.98|171|8.7|75|5|13|14.0|0.69|172|122|
13:09|Deadpool Pony|curve|FDL,FD,FDF,FDB,A1,FDH|0.17|8.36|5.01|5.074|4.07|trail|1424|32.7|17.0|0|0.98|220|10.4|75|5|13|14.0|0.69|172|122|
13:09|Deadpool Pony|curve|FDL,FD,FDF,FDB,A1,FDH,FD35,FD120|-0.01|7.26|4.35|4.405|3.40|trail|1395|32.7|17.0|0|0.98|267|14.2|75|5|13|14.0|0.69|172|122|
13:16|Cristiano Ronaldo|pool|FDB,A1,FDH|0.02|2.06|1.00|0.093|-0.91|trail|2365|0.0|832.0|0|0.00|1529|110.1|66|8|18|145.5|0.80|388|265|
13:17|Doge-02|curve|FDB,A1,FDH,FDHF|-0.01|1.11|0.48|0.177|-0.83|trail|18|0.0|60.4|0|0.00|260|15.7|64|7|14|37.0|0.57|211|67|
13:17|Everyday is Zeroday|pool|A1|0.00|1.39|1.04|1.041|0.03|trail|537|79.3|0.9|667|0.07|59|116.9|75|14|21|44.9|0.37|47|13|
13:20|Community Coin|curve|FD,FDF,FDL,FDB,A1,FD35|-0.87|1.00|0.94|0.944|-0.06|2h|7201|43.8|64.2|0|1.00|20|22.0|74|5|7|20.8|0.72|330|67|
13:20|Community Coin|curve|FDB,A1,FDH|-0.00|1.15|0.67|0.182|-0.83|trail|62|0.0|57.9|0|0.00|285|15.1|93|5|20|25.1|0.61|327|96|
13:22|Socialcoin|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF|-0.06|3.74|1.43|0.169|-0.84|trail|1019|43.8|71.0|0|1.00|283|17.4|62|5|8|20.8|0.77|259|83|
13:23|Socialcoin|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF,FDX,FD120|0.03|2.71|1.04|0.122|-0.89|trail|959|43.8|71.0|0|1.00|427|22.1|62|5|8|20.8|0.77|259|83|
13:25|The Ansem Collective|curve|FD,FDF,FDL,FDB,A1,FDH,FDHF|-0.02|1.66|0.87|0.258|-0.75|trail|99|44.0|63.2|0|0.95|222|10.9|75|5|11|22.3|0.75|204|44|
13:26|The Ansem Collective|curve|FD,FDF,FDL,FDB,A1,FDH,FDHF,FD35,FDX,FD120|0.10|1.13|0.59|0.175|-0.83|trail|45|44.0|63.2|0|0.95|307|14.3|75|5|11|22.3|0.75|204|44|
13:29|This coin is from 2027|curve|FD,FDF,FDL,FDB,A1,FD35,FDH|0.01|6.85|3.96|3.726|2.72|trail|1111|43.5|67.3|0|0.76|185|13.5|63|5|16|24.8|0.68|208|59|
13:30|Socialcoin|pool|FDB,A1,FDH|0.03|2.82|2.09|2.106|1.10|trail|1281|79.3|43.7|0|85.01|18|49.6|69|4|16|96.9|0.94|23|7|
13:30|This coin is from 2027|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDX,FD120|0.02|5.12|2.96|2.785|1.78|trail|1051|43.5|67.3|0|0.76|325|18.0|63|5|16|24.8|0.68|208|59|
13:35|rampad|curve|A1|-1.00|1.00|0.23|0.222|-0.79|trail|2|20.6|1.0|0|0.00|53|10.0|104|4|20|16.8|0.53|171|86|
13:42|GTA6|pool|A1|0.00|1.47|1.10|0.147|-0.86|trail|1173|79.3|10.0|0|0.01|134|115.5|72|10|18|145.4|0.80|395|280|
13:46|galaxycat|curve|A1|-0.91|1.07|0.64|0.633|-0.37|trail|75|13.4|||0.00|81|14.2|100|4|8|3.1|0.82|149|75|
13:46|Chrome-Chan|curve|FD,FDL,FDB,A1,FD35,FDH|0.01|3.95|1.49|0.157|-0.85|trail|1285|43.4|9.4|0|1.00|198|14.0|60|5|7|20.6|0.81|155|65|
13:47|Chrome-Chan|curve|FD,FDL,FDB,A1,FD35,FDH,FD120|0.00|2.42|0.91|0.096|-0.91|trail|1224|43.4|9.4|0|1.00|250|23.1|60|5|7|20.6|0.81|155|65|
13:52|Digital Slop|curve|FDB,A1,FDH|0.03|1.01|0.53|0.149|-0.86|trail|19|0.0|90.5|0|0.00|280|17.5|64|5|31|28.4|0.59|406|179|
13:53|MarsCoin|curve|FDL|0.21|4.61|2.02|0.448|-0.56|trail|473|43.4|41.1|0|0.70|134|8.9|69|5|12|21.3|0.78|159|169|
13:53|MarsCoin|curve|FDL,FD,FDF,FDB,A1,FD35,FDH|-0.05|3.88|1.70|0.377|-0.63|trail|442|43.4|41.1|0|0.70|189|13.6|69|5|12|21.3|0.78|159|169|
13:54|MarsCoin|curve|FDL,FD,FDF,FDB,A1,FD35,FDH,FDX,FD120|0.27|2.58|1.13|0.250|-0.76|trail|412|43.4|41.1|0|0.70|244|15.3|69|5|12|21.3|0.78|159|169|
13:59|donuld tremp|curve|FD,FDF,FDL,FDB,A1,FD35|-0.79|1.00|0.96|0.964|-0.04|2h|7202|43.3|97.8|0|0.65|14|12.9|79|6|22|28.3|0.55|318|63|
14:01|donuld tremp|curve|FD,FDF,FDL,FDB,A1,FDH|-0.75|1.00|0.95|0.955|-0.05|2h|7201|43.7|102.1|0|0.82|223|10.8|71|5|14|23.2|0.66|253|65|
14:02|Elon|curve|FD,FDF,FDL,FDB,A1,FDH|0.13|1.03|0.61|0.248|-0.76|trail|15|43.9|104.0|0|0.96|266|9.8|74|5|12|25.5|0.68|263|61|
14:03|Fomo Family|pool|FDB,A1,FDH|0.03|1.08|0.73|0.498|-0.51|trail|107|0.0|648.8|0|0.00|1885|114.5|69|10|21|144.8|0.79|85|5|
14:04|Elon|curve|FDB,A1,FDH|-0.77|1.00|0.93|0.931|-0.08|2h|7210|0.0|106.5|0|0.00|257|12.3|69|6|20|29.7|0.55|262|65|
14:05|MooToon|curve|FD,FDF,FDL,FDB,A1,FD35,FDH|0.11|1.22|0.62|0.127|-0.88|trail|42|43.0|110.1|0|0.49|274|19.2|66|5|12|24.1|0.70|337|99|
14:06|Toly|curve|FDL|0.23|1.35|0.57|0.300|-0.71|trail|98|43.1|8.2|0|0.53|124|8.1|70|5|17|22.2|0.72|197|223|
14:09|Asdf|curve|FD,FDF,FDL,FDB,A1,FD35,FDH|0.33|1.15|0.67|0.129|-0.88|trail|9|43.0|114.4|0|0.72|287|15.7|76|5|16|23.3|0.73|263|58|
14:10|titcoin|curve|FDL|0.12|8.58|5.14|5.071|4.06|trail|1332|43.9|10.0|0|0.80|144|9.2|71|9|17|23.6|0.64|197|217|
14:10|titcoin|curve|FD,FDF,FDL,FDB,A1,FD35,FDH|-0.05|1.09|0.49|0.213|-0.79|trail|22|43.0|116.3|0|0.76|192|13.3|67|5|21|26.0|0.64|204|37|
14:11|titcoin|curve|FDL,FD,FDB,A1,FDH|-0.02|7.81|4.68|4.614|3.61|trail|1300|43.9|10.0|0|0.80|162|11.5|71|9|17|23.6|0.64|197|217|
14:11|titcoin|curve|FDL,FD,FDB,A1,FDH,FD35,FD120|-0.03|7.17|4.30|4.237|3.23|trail|1271|43.9|10.0|0|0.80|178|12.6|71|9|17|23.6|0.64|197|217|
14:15|Doge-02|curve|FDB,A1,FDH,FDHF|0.04|1.18|0.48|0.184|-0.82|trail|51|0.0|21.1|0|0.00|256|14.2|66|6|6|20.1|0.82|218|68|
14:18|sanctuum|curve|FDL|0.02|1.02|0.58|0.334|-0.67|trail|13|43.4|15.4|0|0.79|220|7.8|67|5|20|21.4|0.77|209|110|
14:19|Whey Protein Coin|curve|FD,FDF,FDL,FDB,A1,FDH|-0.02|1.00|0.51|0.254|-0.75|trail|11|42.8|124.1|0|0.82|203|10.8|74|5|12|23.3|0.67|213|79|
14:19|Elon Mosque|curve|FD,FDF,FDL,FDB,A1,FD35|-0.85|1.00|0.96|0.964|-0.04|2h|7223|47.1|25.7|0|1.00|7|18.0|74|5|7|23.6|0.80|230|55|
14:20|Elon Mosque|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF|0.04|1.15|0.67|0.118|-0.89|trail|44|47.7|32.3|0|0.99|246|22.1|74|5|10|24.3|0.77|135|39|
14:23|Solana Phone|curve|A1|-0.04|1.80|1.06|1.086|0.08|trail|231|36.5||1647|0.00|104|12.1|65|8|40|29.3|0.37|253|156|
14:24|fomo.gay|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF|-0.01|2.43|1.05|0.091|-0.92|trail|671|47.0|37.2|0|0.99|230|22.8|70|5|10|23.7|0.81|187|60|
14:25|fomo.gay|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF,FDX,FD120|0.04|2.02|0.88|0.076|-0.93|trail|596|47.0|37.2|0|0.99|486|25.9|70|5|10|23.7|0.81|187|60|
14:26|The Ansem Collective|curve|FD,FDL,FDB,A1,FDH|-0.02|1.30|0.64|0.286|-0.72|trail|41|42.5|3.7|0|0.60|196|9.7|69|6|19|26.0|0.63|212|57|
14:28|MICHI|curve|FD,FDL,FDB,A1,FD35,FDH|0.02|2.55|1.32|0.204|-0.80|trail|120|43.6|5.6|0|0.58|241|13.1|75|5|14|22.0|0.76|262|89|
14:29|MICHI|curve|FD,FDL,FDB,A1,FD35,FDH,FD120|0.14|1.23|0.64|0.098|-0.91|trail|59|43.6|5.6|0|0.58|423|24.4|75|5|14|22.0|0.76|262|89|
14:31|MICHI|curve|FDB,A1,FDH|-0.06|1.92|0.84|0.223|-0.78|trail|137|0.0|7.6|0|0.00|199|12.9|65|5|25|34.5|0.47|224|75|
14:35|Spill The Tea|curve|FD,FDL,FDB,A1,FD35|-0.80|1.00|0.95|0.953|-0.05|2h|7206|43.2|10.0|0|0.65|8|13.4|83|5|23|28.0|0.57|230|75|
14:37|Spill The Tea|curve|FD,FDL,FDB,A1,FDH|0.06|1.02|0.41|0.230|-0.78|trail|52|43.3|13.6|0|0.67|189|11.1|75|7|11|21.0|0.80|218|82|
14:38|Spill The Tea|curve|FD,FDL,FDB,A1,FDH,FD120|-0.76|1.00|0.96|0.957|-0.05|2h|7218|43.3|13.6|0|0.67|7|11.3|75|7|11|21.0|0.80|218|82|
14:40|the lame duck|curve|FD,FDF,FDL,FDB,A1,FD35,FDH|-0.08|1.06|0.54|0.220|-0.79|trail|24|43.3|15.2|0|0.89|187|13.1|76|5|9|20.5|0.77|189|59|
14:40|the lame duck|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF|0.16|1.08|0.62|0.126|-0.88|trail|8|46.7|55.2|0|0.99|262|18.5|71|5|12|31.2|0.62|201|53|
14:40|titcoin|pool|A1|0.07|1.51|1.12|1.131|0.12|trail|945|65.3|76.5|0|0.10|64|97.4|75|14|23|107.4|0.53|36|12|
14:41|the lame duck|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF|0.07|1.24|0.55|0.098|-0.91|trail|175|46.3|60.0|0|0.99|539|27.2|76|5|16|36.2|0.51|401|61|
14:42|the lame duck|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF,FDX,FD120|0.06|1.06|0.47|0.084|-0.92|trail|115|46.3|60.0|0|0.99|511|32.3|76|5|16|36.2|0.51|401|61|
14:46|Elarion_AI|curve|FDL|-0.71|1.00|0.97|0.967|-0.04|2h|7203|43.6|33.4|0|1.08|6|9.4|72|12|17|20.9|0.39|389|188|
14:46|MexicanAIPikachuConduc|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF|0.08|1.31|0.51|0.142|-0.87|trail|59|46.2|64.9|0|0.99|283|17.4|69|5|8|22.9|0.79|205|54|
14:47|Magical Unicorn|curve|FD,FDF,FDL,FDB,A1|-0.73|1.00|0.96|0.961|-0.05|2h|7219|43.3|20.1|0|0.65|6|9.9|75|11|14|20.6|0.38|206|75|
14:47|The Eagle|curve|FDB,A1,FDH|0.04|7.62|4.57|4.530|3.52|trail|1921|0.0|32.8|0|0.00|111|10.4|74|7|19|24.3|0.70|148|192|
14:47|MexicanAIPikachuConduc|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF,FDX,FD120|-0.86|1.00|0.94|0.942|-0.07|2h|7203|46.2|64.9|0|0.99|430|19.1|69|5|8|22.9|0.79|205|54|
14:48|Magical Unicorn|curve|FD,FDF,FDL,FDB,A1,FDH|0.04|1.40|0.81|0.223|-0.78|trail|79|42.5|21.9|0|0.66|181|11.5|64|11|22|26.6|0.29|205|63|
14:48|Magical Unicorn|curve|FD,FDF,FDL,FDB,A1,FDH,FD35|-0.10|1.31|0.76|0.209|-0.80|trail|49|42.5|21.9|0|0.66|241|14.1|64|11|22|26.6|0.29|205|63|
14:49|Magical Unicorn|curve|FD,FDF,FDL,FDB,A1,FDH,FD35,FDX,FD120|0.01|1.04|0.60|0.167|-0.84|trail|20|42.5|21.9|0|0.66|293|15.8|64|11|22|26.6|0.29|205|63|
14:50|Squeeze|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF|0.16|1.76|0.87|0.140|-0.87|trail|122|46.6|69.4|0|0.99|309|16.7|69|5|6|23.3|0.75|229|72|
14:50|Pawket|curve|FDB,A1,FDH,FDHF|0.25|1.01|0.54|0.143|-0.86|trail|43|0.0|40.1|0|0.00|387|14.8|73|11|31|24.1|0.34|463|217|
14:51|Squeeze|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF,FDX,FD120|0.14|1.12|0.55|0.089|-0.92|trail|61|46.6|69.4|0|0.99|403|26.5|69|5|6|23.3|0.75|229|72|
14:52|SpaceX official|pool|A1|0.02|1.12|0.71|0.466|-0.54|trail|211|0.0|5.0|12|0.00|2205|115.7|72|5|17|119.9|0.95|177|2|
14:56|Velum Agent|curve|FD,FDF,FDL,FDB,A1,FDH|0.18|1.04|0.59|0.215|-0.79|trail|9|43.6|49.0|0|1.38|283|10.7|79|11|33|26.6|0.30|369|293|
14:56|Elon Mosque|curve|FD,FDL,FDB,A1,FD35,FDH|0.02|2.88|1.71|1.677|0.67|trail|1076|46.5|4.8|0|0.99|212|17.6|69|9|11|23.5|0.46|181|90|
14:57|Elon|curve|FD,FDF,FDL,FDB,A1,FDH,FDHF|-0.04|1.40|0.83|0.254|-0.75|trail|132|43.5|38.0|0|0.58|205|10.7|74|12|15|20.6|0.37|212|58|
14:57|Elon Mosque|curve|FD,FDL,FDB,A1,FD35,FDH,FD120|0.06|1.85|1.10|1.076|0.07|trail|1019|46.5|4.8|0|0.99|349|26.4|69|9|11|23.5|0.46|181|90|
14:58|Elon|curve|FD,FDF,FDL,FDB,A1,FDH,FDHF,FD120|0.15|1.14|0.68|0.207|-0.80|trail|75|43.5|38.0|0|0.58|221|11.0|74|12|15|20.6|0.37|212|58|
15:01|CATFISH|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF|0.08|1.06|0.62|0.587|-0.42|trail|61|43.1|60.2|0|0.91|305|15.2|74|11|28|23.8|0.32|344|225|
15:02|CATFISH|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF,FDX,FD120|-0.36|1.32|0.76|0.267|-0.74|trail|49|43.1|60.2|0|0.91|501|15.3|74|11|28|23.8|0.32|344|225|
15:08|United States of Paran|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF|0.02|1.77|0.72|0.186|-0.82|trail|76|42.7|44.1|0|0.62|159|13.6|77|11|31|31.5|0.27|254|71|
15:09|United States of Paran|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF,FDX,FD120|0.06|1.03|0.43|0.111|-0.90|trail|16|42.7|44.1|0|0.62|210|22.0|77|11|31|31.5|0.27|254|71|
15:14|Unstoppable Internet M|curve|FD,FDF,FDL,FDB,A1,FD35|-0.81|1.00|0.95|0.954|-0.05|2h|7202|43.5|48.6|0|0.59|15|13.5|67|11|28|32.2|0.24|258|76|
15:16|Dodo the Black Swan|curve|FDB,A1,FDH|-0.01|3.15|1.26|0.190|-0.82|trail|394|0.0|52.4|0|0.00|113|14.2|64|11|26|28.6|0.29|252|77|
15:17|X(Twitter）|pool|A1|0.01|1.22|0.84|0.608|-0.40|trail|415|39.6|5.0|14|0.10|2188|114.0|67|5|18|120.5|0.95|170|1|
15:26|regular inu|curve|FD,FDF,FDL,FDB,A1,FDH,FDHF|0.32|5.06|3.03|3.027|2.02|trail|1023|43.9|58.8|0|0.75|284|10.2|75|11|25|25.1|0.34|272|65|
15:26|XCHAD|curve|A1|0.18|1.00|0.25|0.150|-0.86|trail|28|38.0|1.4|905|0.49|95|14.5|76|7|13|24.2|0.52|110|46|
15:27|regular inu|curve|FD,FDF,FDL,FDB,A1,FDH,FDHF,FD35|0.19|3.65|2.19|2.185|1.18|trail|994|43.9|58.8|0|0.75|389|15.8|75|11|25|25.1|0.34|272|65|
15:27|regular inu|curve|FD,FDF,FDL,FDB,A1,FDH,FDHF,FD35,FDX,FD120|0.14|2.45|1.46|1.463|0.46|trail|964|43.9|58.8|0|0.75|503|24.7|75|11|25|25.1|0.34|272|65|
15:27|Valseq|curve|FDB,A1,FDH|0.05|1.02|0.59|0.247|-0.76|trail|5|0.0|10.8|0|0.00|326|9.8|71|11|40|28.4|0.27|394|228|
15:46|Grand Theft Auto VI|pool|A1|0.02|1.31|0.97|0.991|-0.02|trail|60|79.3|2.5|101|1.98|197|93.7|67|8|17|133.8|0.66|336|94|
15:54|THE BLACK SWAN|curve|A1|0.30|1.02|0.60|0.535|-0.47|trail|61|37.1||1744|0.00|53|11.1|68|3|18|19.2|0.85|121|84|
16:13|Jackass Coin|curve|A1|-0.04|1.00|0.60|0.565|-0.44|trail|8|0.0|||0.00|137|10.3|93|4|40|38.9|0.57|496|343|
16:16|fiat|curve|A1|-0.92|1.18|0.70|0.738|-0.27|trail|41|0.0|||0.00|94|12.3|66|6|26|20.2|0.52|237|199|
16:54|The Red Wave|curve|FDB,A1,FDH,FDHF|0.08|1.11|0.51|0.151|-0.86|trail|51|0.0|76.0|0|0.00|256|15.7|65|11|27|26.7|0.31|262|58|
16:56|Gay And Poor|curve|FD,FDF,FDL,FDB,A1|-0.73|1.00||||||42.7|79.3|0|0.61|2|9.5|117|11|22|23.6|0.32|186|140|
16:56|Codex|curve|FD,FDF,FDL,FDB,A1|-0.73|1.00||||||46.6|27.3|0|0.99|9|9.5|82|10|11|23.3|0.44|98|55|
16:57|Gay And Poor|curve|FDL|0.12|1.29|0.52|0.280|-0.73|trail|63|43.1|80.9|0|0.85|121|8.1|64|11|20|24.8|0.30|138|68|
16:57|Gay And Poor|curve|FDL,FD,FDF,FDB,A1,FDH|-0.07|1.21|0.49|0.263|-0.74|trail|32|43.1|80.9|0|0.85|165|10.4|64|11|20|24.8|0.30|138|68|
16:57|Gay And Poor 500|curve|FD,FDF,FDL,FDB,A1,FDH,FDHF|-0.00|1.00|0.56|0.252|-0.76|trail|5|42.8|81.8|0|0.88|253|10.3|74|11|29|25.1|0.31|274|70|
16:58|Gay And Poor|curve|FDL,FD,FDF,FDB,A1,FDH,FD120|-0.04|1.00|0.42|0.224|-0.78|trail|3|43.1|80.9|0|0.85|220|11.8|64|11|20|24.8|0.30|138|68|
16:58|Novembear|curve|A1|0.01|1.14|0.68|0.774|-0.23|trail|151|25.4||1834|0.00|89|13.4|62|5|18|17.7|0.46|173|115|
16:59|Gay And Poor 500|curve|FD,FDF,FDL,FDB,A1,FDH|-0.73|1.00||||||44.2|83.7|0|0.85|236|9.7|75|14|22|25.0|0.31|256|80|
17:00|Lock Inu|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF|0.06|1.77|0.82|0.167|-0.84|trail|167|46.8|29.7|0|0.99|295|15.1|75|9|11|23.4|0.47|222|51|
17:00|Elon Musk|curve|FDB,A1,FDH|0.38|2.42|1.24|0.190|-0.82|trail|93|0.0|85.5|0|0.00|223|9.8|66|12|24|25.8|0.28|242|91|
17:01|Lock Inu|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF,FDX,FD120|0.08|1.36|0.63|0.128|-0.88|trail|107|46.8|29.7|0|0.99|446|19.3|75|9|11|23.4|0.47|222|51|
17:01|Novembear|curve|FDB,A1,FDH,FDHF|0.22|1.80|1.00|0.198|-0.81|trail|129|0.0|85.7|0|0.00|158|10.8|69|11|21|28.9|0.29|160|86|
17:04|TOYODA|curve|FD,FDL,FDB,A1,FD35,FDH|0.23|3.79|2.15|2.203|1.20|trail|681|44.1|4.3|0|0.59|259|15.5|69|12|18|24.3|0.32|298|102|
17:05|BULLTRAP|curve|FDL|0.07|1.30|0.59|0.310|-0.70|trail|22|43.3|88.2|0|0.66|135|7.7|73|11|24|24.5|0.37|164|123|
17:05|relax|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF|0.14|1.81|0.68|0.085|-0.92|trail|710|47.4|40.2|0|0.99|496|21.8|70|12|12|23.7|0.49|389|77|
17:05|TikTok US|pool|A1|0.01|1.05|0.73|0.736|-0.27|trail|97|39.6|5.0|0|0.10|2183|119.5|75|5|18|120.6|0.95|335|73|
17:06|TOYODA|pool|FD,FDL,FDB,A1,FD35,FDH,FD120|0.34|1.35|1.01|1.036|0.03|trail|272|44.1|4.3|0|0.59|545|30.1|69|12|18|24.3|0.32|298|102|
17:06|relax|curve|FD,FDF,FDL,FDB,A1,FD35,FDH,FDHF,FDX,FD120|0.04|1.90|0.71|0.089|-0.92|trail|649|47.4|40.2|0|0.99|502|22.8|70|12|12|23.7|0.49|389|77|
17:07|Believe|curve|FD,FDF,FDL,FDB,A1,FDH|-0.71|1.00||||||43.1|89.9|0|0.52|120|9.2|67|11|27|26.4|0.31|160|148|
17:08|Believe|curve|FDB,A1,FDH|0.10|5.22||||||0.0|91.5|0|0.00|137|11.9|65|11|24|25.0|0.33|177|139|
17:12|never kill yourself|curve|A1|0.45|1.29|0.76|0.830|-0.18|trail|159|17.6|5.0|0|3.00|160|15.8|71|5|16|17.4|0.75|389|277|
17:23|Waste Management|curve|FDL|0.03|1.94|0.89|0.275|-0.73|trail|128|47.4|5.9|0|0.99|143|9.0|73|9|11|23.9|0.47|80|41|
17:23|Waste Management|curve|FDL,FD,FDB,A1,FDH|0.01|1.94|0.89|0.275|-0.73|trail|98|47.4|5.9|0|0.99|143|9.1|73|9|11|23.9|0.47|80|41|

## Earlier context the analyst should know
- Paper (not executable) results before 12:20 showed 36–45% win rates and +24–43% averages on the same rules; the gap is the stale bonding-curve price the paper book used for entries and the one-slot dumps the paper trail did not see. Treat only SIM/LIVE as real.
- 'Funded dev' pre-filter: creator funded by a private wallet with ≤2 launches, ≥2 SOL, within 2 h. FDB = FD without the funding rule (buying bar only). A1 = buying bar only, broader. FDH = FDB minus coins whose GMGN holders < 0.5 × GMGN buyers. FDF = FD with funder ≥ 15 SOL. FDL = FD looser. FD35/FD120 = FD entering at 35 s / 120 s. FDX = FD stricter. FDHF = FDH + funder 19–100 SOL.
- Live execution: Jupiter keyless API (30 req/min) — 6 live buys lost to 429 rate limits; buys land 0.6–1.9 s, sells 0.5–1.4 s.

## QUESTIONS FOR THE ANALYST (answer with numbers from the tables above, not general advice)
1. Rugs vs runners: using ONLY the entry-time columns (bundle, funder_sol, funder_launches, dev_buy, holders, mc_k, slot0, buyers, buy_sol, top3, g_buys, g_sells, socials, venue, age_s), is there any rule that keeps most of the 10 winners (exit ≥ 1.2) and removes most of the 54+ rugs (exit < 0.35)? State the rule, how many winners it keeps, how many rugs it removes, and the net SOL of what remains at 0.02 stake. Say plainly if there is no such rule.
2. Launch templates: do you agree templates A/B/C are factory launches that should be excluded? Can you define them more precisely from the columns? What is left after excluding them, and is it positive?
3. Exit: given that a rug fills at ~0.4x of its trigger price (one-slot dumps), and winners sold at 54–61% of their high, what exit would you test next and what is its expected effect on THESE 84 first entries (show the arithmetic)? Consider: tighter trail, take-profit at 1.3x/1.5x, selling in parts, time stops.
4. Timing: FD120 (entry at 120 s) won 26% vs 14% at 60 s on the same coins. Is later entry a real effect or noise with 27 trades? What entry time would you test?
5. Re-entries: the 60/90/120-s checks re-entered the same coin (33 of 134 entries). Keep, forbid, or use as a signal?
6. Anything else in the data we have missed. Be terse; a table of numbers beats prose.