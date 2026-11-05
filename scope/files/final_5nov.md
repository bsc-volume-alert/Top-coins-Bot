# FINAL CONCLUSION — pump.fun funded-dev books, 5 Nov 2026, 12:20 → 20:30 UK
# Written by Claude for review by Gemini. Everything below is from the bot's own records (simulated executable fills, real wallet trades, the tracker's per-trade stream). Numbers were reproduced independently by Codex (ChatGPT) and Gemini earlier today where stated.

THE GOAL, in the owner's words: "winners, we want to keep them. Losers, we want to come out and not even come near them."

## 0. What the system is
A bot watches every pump.fun launch. Coins whose creator was funded by a private wallet (few launches, ≥ 2 SOL, within 2 h) and that show strong buying in their first minute are "entered" at the 60-s check (also 90/120 s) by several rule variants ("books"), stake 0.02 SOL in the live book (FD), 0.2 SOL in the paper/simulated books. Exit: 40% trailing stop from the high on bonding-curve coins (25% on graduated/PumpSwap), or 2 h.
Books: FD (funding test + bundle 10–60% + net ≥ 27 SOL, mc ≥ 100 SOL, ≥ 3 buys of 2+ SOL at 60 s); FDL (funding + net ≥ 15, mc ≥ 60); FDB (FD's buying bar, no bundle test); A1 (buying bar only, control); FDH (FDB minus GMGN holders < 0.5 × chain buyers); FDF (FD + funder ≥ 15 SOL); FD35 (net ≥ 35, mc ≥ 130); FD120 (FD at the 120-s check if still rising); FDX; FDHF.
Measures: PAPER (old; entry at a stale chain price, exit on 1-min candles — unreliable, kept only as a record); SIM = simulated executable fill from 12:20 UK (entry = tokens that 0.2 SOL buys from the curve/pool reserves 1 s after the check; exit = SOL those tokens fetch from the reserves 0.7 s after the trail triggers; fee 0.0015 SOL); LIVE = FD bought and sold for real with 0.02 SOL via Jupiter (38 confirmed buys, stopped 19:06 UK).
r = net return per trade (−0.80 = lost 80%). "true at 0.02" = r with the 0.0015 SOL fee charged against a 0.02 stake (7.5%), the figure that matches the wallet. "no-best" = net without the single best trade.

## 1. Timeline of today
- 12:20 — simulated executable fills live (launcher 0.9.0–0.9.5). Every book scored on SIM from here.
- 12:20–17:23 — 514 book entries on 105 distinct coins (141 distinct coin-entries incl. later-check entries). FD's Helius budget (120k credits) ran out 17:23; no new entries until 00:00 UK.
- 08:27–17:23 — live FD: 38 confirmed real buys, 4 winners, net −0.30 SOL on 0.87 in; wallet 0.39 → 0.23.
- 18:00 — first full read (section 2). 18:36 — Codex review (corrections accepted, section 6). 18:55 — Gemini review (three structural points, reproduced, section 6). 19:06 — launcher 0.9.6: live FD OFF; new simulated books FDLU, FDU, FDLU120, FDU120; true-fee and half-at-2x columns; holder-growth log. 19:32 — tracker 0.19.0 + launcher 0.9.7: every trade of any launch reaching 15 SOL of buys is stored; trades of the books' coins exported; same-name copy logged. 20:25 — dump reconstruction (section 5).

## 2. Per book on simulated fills, 12:20–17:23 UK (first read, stake 0.02; fee here at the 0.2 scale — subtract ≈ 0.0013 SOL per trade for the true 0.02 figure)
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

Every book negative; win rates 12–16%; 60–85% of closes under 0.35x.

## 3. Live FD (real money) against its simulated twin, matched by signal id
RECONCILED LEDGER — live FD trade matched to the chain_fill row of the SAME paper signal (vol_id), not by name
time     coin                   live_in  live_out  live_x  sim_x   diff   sim_entry_px/live_buy_px  live_r@0.02  fee_sol  cause
09:43:01 The 10 Year Old Trench 0.0219  0.0210   0.957  0.000  +0.000  0.000                  -0.043      0.0019  no sim row for this signal
12:23:43 Sam Apeman             0.0215  0.0063   0.292  0.709  -0.417  1.019                  -0.708      0.0015  sim before 0.9.2 landing delays
12:30:24 Privacy Dog            0.0218  0.0204   0.932  0.296  +0.637  4.777                  -0.068      0.0018  entry at different price (sim gap 0.19, live gap -0.75)
12:46:04 finance inu            0.0216  0.0014   0.063  0.069  -0.006  1.025                  -0.937      0.0016  
12:47:30 Chrome-Chan            0.0215  0.0207   0.960  0.953  +0.008  1.031                  -0.040      0.0015  
12:58:29 memory coin            0.0218  0.0704   3.231  3.312  -0.081  1.047                  +2.231      0.0018  
13:00:47 Pillheads              0.0216  0.0067   0.312  0.262  +0.050  1.044                  -0.688      0.0016  
13:04:12 Elon Musk              0.0217  0.0163   0.752  0.747  +0.005  1.039                  -0.248      0.0017  
13:20:08 Community Coin         0.0217  0.0204   0.942  0.944  -0.002  1.025                  -0.058      0.0017  
13:22:23 Socialcoin             0.0215  0.0046   0.211  0.169  +0.043  1.028                  -0.789      0.0015  
13:25:08 The Ansem Collective   0.0217  0.0066   0.302  0.258  +0.044  1.033                  -0.698      0.0017  
13:29:17 This coin is from 2027 0.0218  0.0752   3.446  3.726  -0.280  1.032                  +2.446      0.0018  sim before 0.9.2 landing delays
13:46:17 Chrome-Chan            0.0215  0.0046   0.212  0.157  +0.055  1.027                  -0.788      0.0015  
13:53:33 MarsCoin               0.0218  0.0092   0.420  0.377  +0.044  1.047                  -0.580      0.0018  
13:59:41 donuld tremp           0.0215  0.0209   0.973  0.964  +0.009  1.031                  -0.027      0.0015  
14:01:09 donuld tremp           0.0216  0.0208   0.963  0.955  +0.008  1.031                  -0.037      0.0016  
14:09:01 Asdf                   0.0218  0.0039   0.180  0.129  +0.051  1.027                  -0.820      0.0018  
14:10:30 titcoin                0.0216  0.0056   0.261  0.213  +0.048  0.997                  -0.740      0.0016  
14:19:15 Whey Protein Coin      0.0217  0.0066   0.303  0.254  +0.049  1.038                  -0.697      0.0017  
14:21:00 Elon Mosque            0.0219  0.0037   0.170  0.118  +0.052  1.040                  -0.830      0.0019  
14:24:44 fomo.gay               0.0215  0.0033   0.152  0.091  +0.061  1.046                  -0.848      0.0015  
14:35:56 Spill The Tea          0.0215  0.0207   0.961  0.953  +0.008  1.031                  -0.039      0.0015  
14:37:34 Spill The Tea          0.0219  0.0061   0.278  0.230  +0.048  1.027                  -0.722      0.0019  
14:40:05 the lame duck          0.0215  0.0054   0.249  0.220  +0.029  1.036                  -0.751      0.0015  
14:46:50 MexicanAIPikachuConduc 0.0216  0.0043   0.200  0.142  +0.058  1.036                  -0.800      0.0016  
14:48:04 Magical Unicorn        0.0222  0.0061   0.274  0.223  +0.051  1.062                  -0.726      0.0022  
14:50:04 Squeeze                0.0216  0.0042   0.197  0.140  +0.057  1.027                  -0.803      0.0016  
14:56:37 Velum Agent            0.0216  0.0069   0.319  0.215  +0.103  1.031                  -0.681      0.0016  sim before 0.9.2 landing delays
14:57:06 Elon                   0.0219  0.0066   0.304  0.254  +0.050  1.046                  -0.696      0.0019  
15:01:34 CATFISH                0.0215  0.0136   0.630  0.587  +0.043  1.043                  -0.370      0.0015  
15:08:03 United States of Paran 0.0218  0.0037   0.170  0.186  -0.016  1.040                  -0.830      0.0018  
15:14:17 Unstoppable Internet M 0.0217  0.0207   0.957  0.954  +0.002  1.031                  -0.043      0.0017  
15:26:53 regular inu            0.0217  0.0614   2.827  3.027  -0.200  1.005                  +1.827      0.0017  sim before 0.9.2 landing delays
16:56:52 Gay And Poor           0.0215  0.0000   0.000  0.000  +0.000  1.031                  +0.000      0.0015  open
16:59:18 Gay And Poor 500       0.0215  0.0000   0.000  0.000  +0.000  1.031                  +0.000      0.0015  open
17:00:04 Lock Inu               0.0216  0.0049   0.228  0.167  +0.061  1.069                  -0.772      0.0016  
17:04:55 TOYODA                 0.0220  0.0453   2.060  2.203  -0.143  1.043                  +1.060      0.0020  sim before 0.9.2 landing delays
17:05:39 relax                  0.0216  0.0032   0.149  0.085  +0.064  1.066                  -0.851      0.0016  
17:07:10 Believe                0.0217  0.0000   0.000  0.000  +0.000  1.025                  +0.000      0.0017  open
17:23:39 Waste Management       0.0215  0.0070   0.325  0.275  +0.050  1.028                  -0.675      0.0015  

matched pairs 36: signed median +0.044, median ABSOLUTE 0.050, within 0.04: 10, over 0.10: 6
fee per live trade (SOL above stake, incl. rent later refunded ~0.002): median 0.0016; sim fee constant 0.0015 on a 0.2 stake = 0.75%, at 0.02 = 7.5%

FDU cohort = coins that passed FD's rule, first entry per mint, 30% pre-fill rejection, fees rescaled to 0.02:
FD as is                                           n=42 winners=7 rugs=31 net@0.02 (fees at 0.02)=-0.2647 no-best=-0.3447
FDU: holders<200 & mc<$15k                         n=14 winners=3 rugs=10 net@0.02 (fees at 0.02)=-0.0141 no-best=-0.0849
FD + holders<200 only                              n=14 winners=3 rugs=10 net@0.02 (fees at 0.02)=-0.0141 no-best=-0.0849

Reading: 36 pairs, signed median +0.044 (rent refund at close ≈ 9% of a 0.02 stake), median absolute 0.050; 10 within 4 points, 6 over 10 (Sam Apeman: sim scored before the landing-delay fix; Privacy Dog: live filled after the dump, sim at the check price; This coin / regular inu / TOYODA / Velum Agent: live sold 10–28 points under sim — the live sell lands ~1 s after the trigger on a falling price). Live buys fill 2.5–7% above the sim entry. Buys land in 0.6–1.9 s, sells 0.5–1.4 s. Fees: median 0.0016 SOL above stake per buy (sim 0.0015) plus 0.002 rent refunded at close.

## 4. Exits, timing, templates (first entry per coin, 84 coins)
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

Winners sold at 54–61% of their high (the 40% trail): Deadpool Pony high 10.55x sold 6.40; titcoin 8.58 → 5.07; The Eagle 7.62 → 4.53; This coin is from 2027 6.85 → 3.73; memory coin 5.61 → 3.31; regular inu 5.06 → 3.03; TOYODA 3.79 → 2.20; Elon Mosque 2.88 → 1.68. Rugs' high before the dump: 18 never passed 1.1x, 11 at 1.1–1.3, 7 at 1.3–1.5, 9 at 1.5–2, 9 over 2x; sold at 0.13/0.18/0.25/0.33x (quartiles). Trail what-if (winners re-priced to a tighter trail if it had held to the same high, rugs unchanged): 40% −0.57 SOL, 25% −0.41, 15% −0.30 — a ceiling, and an earlier study (04:15 UK, 63 curve runners) found the 25% trail gets shaken out early (+103% vs +125% for 40%).

Launch templates (entry-time features): A: bundle 43-50%, 5 slot-0 wallets, ~24 SOL, dev ~1 SOL n=29  WIN=2 MID=5 RUG=22   winners: memory, This
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
Excluding A/B/C leaves −0.10 SOL on 35 (no-best −0.21): not an edge, and it holds half the winners. (Claude's first figure "about −0.06" was wrong; Codex caught it.)

## 5. What runners and rugs DO — from the 60/90/120-s check rows (84 first entries) and from the transaction stream (71 reconstructed)
### 5a. Check rows
coins with checks 84 Counter({'RUG': 54, 'MID': 20, 'WIN': 10})

=== check at 60 s (quartiles 25/50/75) ===
metric                               WIN                     MID                     RUG   n(W/M/R)
net                   25.5/  30.0/  45.3      26.4/  41.7/ 116.1      30.5/  39.2/  51.5    [10, 20, 54]
buySol                63.1/  81.7/  94.2      71.7/ 103.3/ 131.1      71.3/  79.6/  93.6    [10, 20, 54]
sellSol               27.4/  42.2/  57.5       8.0/  38.4/  61.8      32.5/  40.6/  45.3    [10, 20, 54]
buyers                95.5/ 159.5/ 220.8      89.2/ 182.0/ 253.5     154.5/ 203.0/ 259.0    [10, 20, 54]
sells                 51.0/  77.5/ 139.5      12.2/  67.0/ 145.8      58.0/  70.5/ 101.8    [10, 20, 54]
sellers               21.8/  43.0/ 110.2       9.0/  28.0/  97.5      27.2/  36.5/  54.8    [10, 20, 54]
exited                17.8/  27.5/  40.0       5.0/  15.5/  58.0      13.0/  16.5/  25.2    [10, 20, 54]
holding               69.5/ 124.0/ 196.2      51.5/ 119.0/ 199.8     131.0/ 188.0/ 239.0    [10, 20, 54]
big                    4.0/   4.0/   5.2       4.0/   5.0/   7.8       4.0/   5.0/   7.0    [10, 20, 54]
mcSol                 95.8/ 111.7/ 176.4      99.1/ 170.2/1156.4     113.9/ 148.7/ 206.3    [10, 20, 54]
top1_pct               7.0/  11.2/  13.6       4.5/  10.9/  17.0       3.0/   7.1/  14.2    [10, 20, 54]
top5_pct              14.1/  30.8/  42.6      15.6/  37.3/  48.0      10.3/  24.9/  41.4    [10, 20, 54]
top10_pct             19.8/  38.4/  51.9      25.0/  46.5/  50.7      17.1/  36.7/  48.2    [10, 20, 54]
dev_sold_pct          75.0/ 100.0/ 100.0       0.0/ 100.0/ 100.0     100.0/ 100.0/ 100.0    [10, 16, 54]
bundle_sold_pct                     -                       -                       -       [0, 0, 0]
early_n               13.8/  16.5/  20.5      16.2/  18.0/  21.0      11.0/  16.0/  24.0    [10, 20, 54]
early_sol             23.6/  24.3/  28.6      21.6/  30.2/ 116.8      23.2/  24.9/  28.5    [10, 20, 54]
holders               57.5/ 157.5/ 223.8      70.2/ 178.5/ 326.0     185.8/ 235.5/ 284.0    [10, 20, 54]

=== check at 90 s (quartiles 25/50/75) ===
metric                               WIN                     MID                     RUG   n(W/M/R)
net                   31.5/  38.7/  59.3      35.6/  43.9/ 112.1      25.2/  39.6/  56.5    [10, 20, 54]
buySol                69.5/  96.8/ 108.5      92.2/ 118.4/ 144.6      86.2/ 104.3/ 116.8    [10, 20, 54]
sellSol               38.3/  50.3/  69.6      17.0/  58.3/  89.6      45.5/  58.3/  73.1    [10, 20, 54]
buyers               164.0/ 240.0/ 313.2     100.0/ 264.0/ 316.2     220.5/ 282.0/ 360.2    [10, 20, 54]
sells                 61.8/ 116.0/ 195.8      28.8/ 110.0/ 224.8     106.0/ 129.5/ 236.2    [10, 20, 54]
sellers               30.5/  69.5/ 142.0      12.0/  72.5/ 150.8      50.0/  83.0/ 144.0    [10, 20, 54]
exited                24.2/  43.0/  56.0       8.8/  28.5/ 108.0      20.8/  32.5/  80.2    [10, 20, 54]
holding              118.2/ 175.5/ 283.5      73.8/ 136.0/ 276.8     133.8/ 203.5/ 308.2    [10, 20, 54]
big                    4.0/   4.0/   5.2       4.0/   5.0/  10.0       4.0/   5.0/   7.0    [10, 20, 54]
mcSol                117.6/ 147.7/ 248.0     145.5/ 222.0/1162.6      82.5/ 150.3/ 232.2    [10, 20, 54]
top1_pct               4.0/   9.3/  13.6       4.3/  10.3/  17.0       1.9/   7.0/  14.2    [10, 20, 54]
top5_pct               9.6/  27.8/  42.6      14.7/  36.5/  47.5       6.9/  26.1/  40.6    [10, 20, 54]
top10_pct             15.2/  35.3/  51.5      25.4/  44.9/  50.8      12.0/  36.7/  47.6    [10, 20, 54]
dev_sold_pct          75.0/ 100.0/ 100.0       0.0/ 100.0/ 100.0     100.0/ 100.0/ 100.0    [10, 16, 54]
bundle_sold_pct                     -                       -                       -       [0, 0, 0]
early_n               13.8/  16.5/  20.5      16.2/  18.0/  21.0      11.0/  16.0/  24.0    [10, 20, 54]
early_sol             23.6/  24.3/  28.6      21.6/  30.2/ 116.8      23.2/  24.9/  28.5    [10, 20, 54]
holders              130.8/ 195.5/ 304.2      75.2/ 164.0/ 845.0     168.2/ 290.0/ 399.8    [10, 18, 42]

=== check at 120 s (quartiles 25/50/75) ===
metric                               WIN                     MID                     RUG   n(W/M/R)
net                   34.1/  43.6/  67.7      20.9/  42.1/ 109.8      16.1/  31.9/  60.6    [10, 20, 53]
buySol                85.6/ 114.4/ 131.0      97.5/ 131.3/ 161.2      91.7/ 112.7/ 142.8    [10, 20, 53]
sellSol               46.9/  59.7/  85.1      25.7/  71.7/ 111.4      60.2/  73.1/  91.6    [10, 20, 53]
buyers               210.8/ 295.0/ 406.0     103.5/ 298.5/ 386.0     252.0/ 328.0/ 432.0    [10, 20, 53]
sells                 83.8/ 176.0/ 241.2      34.0/ 180.5/ 269.8     162.5/ 216.0/ 327.0    [10, 20, 53]
sellers               51.0/ 111.0/ 169.2      19.8/ 116.5/ 190.5      93.0/ 136.0/ 203.0    [10, 20, 53]
exited                23.8/  51.0/  75.5      11.2/  53.0/ 145.8      35.5/  60.0/ 176.0    [10, 20, 53]
holding              144.5/ 253.0/ 375.5      71.8/ 139.5/ 365.2     128.5/ 196.0/ 312.0    [10, 20, 53]
big                    4.0/   4.0/   5.2       4.0/   5.0/  10.0       4.0/   5.0/   7.0    [10, 20, 53]
mcSol                127.9/ 169.0/ 296.6      72.4/ 214.1/1180.6      28.3/ 120.0/ 254.8    [10, 20, 53]
top1_pct               2.0/   9.1/  13.6       2.8/   8.4/  15.1       1.4/   6.5/  14.2    [10, 20, 53]
top5_pct               7.5/  26.7/  42.6      12.3/  25.6/  46.0       6.1/  25.1/  40.2    [10, 20, 53]
top10_pct             13.2/  34.1/  51.5      19.8/  40.6/  48.5      10.6/  36.8/  45.4    [10, 20, 53]
dev_sold_pct          75.0/ 100.0/ 100.0       0.0/ 100.0/ 100.0     100.0/ 100.0/ 100.0    [10, 16, 53]
bundle_sold_pct                     -                       -                       -       [0, 0, 0]
early_n               13.8/  16.5/  20.5      16.2/  18.0/  21.0      11.0/  16.0/  24.0    [10, 20, 53]
early_sol             23.6/  24.3/  28.6      21.6/  30.2/ 116.8      23.1/  24.9/  28.5    [10, 20, 53]
holders              146.8/ 271.0/ 387.5     143.0/ 274.0/1887.0     220.5/ 403.0/ 495.5    [10, 15, 29]

=== change from the 60-s check (quartiles) ===
-- 60 -> 90 s
net                    2.5/   5.9/  10.4      -3.2/   1.2/   9.4      -4.1/   0.7/   7.2
buyers                45.5/  79.5/ 104.5      20.5/  68.5/ 105.8      49.8/  70.0/ 109.5
sellers                3.0/  28.0/  34.2       6.0/  26.0/  44.2      14.0/  29.0/  57.5
exited                 2.0/  11.5/  23.2       2.0/   6.5/  26.8       4.0/  11.0/  35.8
mcSol                  9.3/  21.2/  49.9     -29.7/  33.7/  88.3     -27.5/  12.9/  31.8
holders               16.0/  56.5/ 107.5      11.8/  50.0/  92.0      16.8/  59.0/  95.2
top10_pct             -2.1/  -0.3/   0.0      -1.3/  -0.3/   0.8      -4.0/  -0.2/   0.0
dev_sold_pct           0.0/   0.0/   0.0       0.0/   0.0/   0.0       0.0/   0.0/   0.0
bundle_sold_pct                     -                       -                       -   
-- 60 -> 120 s
net                    1.0/  10.0/  20.5     -10.1/  -1.2/   6.7     -20.2/  -2.3/   9.6
buyers                78.8/ 149.0/ 222.0      29.2/ 104.5/ 198.0      69.5/ 116.0/ 156.0
sellers               15.8/  57.0/  73.2      14.0/  64.5/  99.8      40.5/  78.0/ 150.0
exited                 7.5/  19.5/  43.0       3.2/  20.0/  90.2      15.0/  43.0/ 151.5
mcSol                  3.8/  41.5/ 110.9     -51.0/   2.7/  76.3    -116.1/ -26.8/  46.2
holders               29.8/ 116.5/ 219.0      22.0/  98.0/ 196.0      51.5/  99.0/ 149.0
top10_pct             -3.8/  -0.5/  -0.3      -4.5/  -0.8/  -0.0      -7.9/  -2.2/   0.0
dev_sold_pct           0.0/   0.0/   0.0       0.0/   0.0/   0.0       0.0/   0.0/   0.0
bundle_sold_pct                     -                       -                       -

Reading: at 60 s runners and rugs are the same coin on money (net 30 vs 39 SOL, 82 vs 80 SOL bought, 4 vs 5 big buys, 16 early wallets / 24 SOL in both, dev sold 100% in both — "dev sold" is useless). Rugs have more buyers (203 vs 160), more wallets still holding (188 vs 124), more GMGN holders (235 vs 158); runners already churn (43 sellers vs 36, 27 exited vs 16). 60 → 90 s net buying: runners +5.9 SOL (lower quartile +2.5), rugs +0.7 (lower quartile −4.1); 60 → 120 s runners +10 / mc +41 SOL, rugs −2.3 / mc −27. Top-10 share, dev selling: no separation. bundle_sold_pct is empty (recording off).

### 5b. The dumps, transaction by transaction (tracker trades table; columns: drop = worst price fall within ≤ 3 consecutive slots after entry; slots; t+ = seconds after entry; hi_b4/px_b4 = high and price just before it (entry = 1); after; sells/sellers/SOLout in the dump; grpSellers/grpSOL = first-3-s launch wallets among them; grp30s = launch-group SOL sold in the 30 s before; net30 = net flow in the 30 s before; sel30 = sellers in the 30 s before; lead = seconds from the first ≥ 0.5 SOL launch-group sale to the dump; grpHeld% = launch group's share of supply at entry)
71 coins reconstructed
cls name                drop slots    t+ hi_b4 px_b4 after sells sellers SOLout grpSellers grpSOL grp30s  net30 sel30  lead grpHeld% exit
MID Sam Apeman           81%     3    29  1.31  0.31  0.24    64      64    1.9          4    0.1    0.1  -12.9   100     -      0.9 0.71
MID CATFISH              71%     4   107  1.06  0.21  0.16   121     121    2.0          5    0.1    5.5  -16.5   187    48     47.1 0.59
MID Chiplon Musk         67%     3     4  1.03  1.03  0.34    97      97   13.1          2    0.4    0.0   +0.9     2     -      1.5 0.57
MID Jackass Coin         23%     4   398  1.02  0.55  0.43     8       4   10.1          0    0.0    5.8   -9.0    10   389      3.7 0.56
MID MarsCoin             12%     4    24  1.37  1.23  1.10    11      11    3.8          0    0.0    0.0   +6.7    41     -     41.3 0.45
MID Elon Musk            10%     4    90  1.37  1.37  1.24    23      23    5.4          0    0.0    0.0   +6.9    41     -     41.9 0.75
MID Elon                  3%     4     2  1.00  1.00  1.00     1       1    0.0          0    0.0    0.0   +0.0     0     -      3.7 0.93
MID Believe               2%     3     4  1.01  1.01  0.99     3       3    0.4          0    0.0    0.0   +0.2     4     -      4.2 0.92
MID United States of E    1%     4     4  1.00  1.00  0.99     2       2    0.2          0    0.0    0.0   +0.0     1     -      1.7 0.57
MID Chrome-Chan           1%     1     6  1.00  1.00  0.99     2       2    0.1          0    0.0    0.0   -0.0     1     -     38.0 0.95
MID Community Coin        1%     1     5  1.00  0.99  0.99     2       1    0.2          0    0.0    0.0   -0.2     2     -     65.7 0.94
MID Spill The Tea         1%     1   157  1.00  1.00  0.99     1       1    0.1          0    0.0    0.0   +0.0     0     -      3.7 0.95
MID fomo.gay              1%     2    30  1.00  1.00  0.99     2       2    0.1          0    0.0    0.0   -0.0     8     -     39.7 0.95
MID Elon Mosque           1%     1   208  1.01  1.01  1.00     2       1    0.2          0    0.0    0.0   +0.0     0     -     21.0 0.96
MID Unstoppable Intern    1%     2    18  1.00  0.99  0.99     2       2    0.1          0    0.0    0.0   -0.1     4     -      6.8 0.95
MID Magical Unicorn       0%     1   411  1.00  1.00  0.99     1       1    0.0          0    0.0    0.0   +0.0     0     -      0.0 0.96
MID Gay And Poor 500      0%     1   735  1.00  0.99  0.99     1       1    0.0          0    0.0    0.0   +0.0     0     -      0.8 0.96
MID donuld tremp          0%     1    34  1.00  1.00  1.00     1       1    0.0          0    0.0    0.0   -0.0     3     -      0.7 0.96
RUG fomo.gay             92%     3   241  1.28  1.26  0.10   243     243   50.4          0    0.0    0.0   +0.4    10   200     45.4 0.10
RUG MICHI                92%     4   120  2.55  0.24  0.20   218     109    5.4          0    0.0    2.1 -147.6   358   117     25.1 0.20
RUG Elon Musk            92%     4    92  2.46  2.42  0.19   246     246   45.7          6    2.4    0.8   +4.8    42    21      4.1 0.19
RUG Squeeze              92%     4   120  1.80  1.78  0.14   202     202   46.9          0    0.0    0.0   +5.6    16     -     32.7 0.14
RUG the lame duck        92%     4   174  1.27  1.22  0.10   238     238   52.8          3   20.6    0.0   -0.0    18     -     43.3 0.10
RUG Lock Inu             91%     3   166  1.72  1.72  0.16   218     218   48.0          0    0.0    0.0   +8.0    12     -     32.7 0.17
RUG Elon Mosque          90%     4    43  1.18  1.18  0.12   704     386  127.3          2    0.1    0.0  +10.4    43     -     73.4 0.12
RUG Elon Mosque          90%     4    29  1.13  1.02  0.10   254     253   43.0          4   13.8    0.0   +1.0    52     -     45.7 0.10
RUG MooToon              90%     4    41  1.23  1.23  0.13   204     204   39.0          6   14.5    4.8   +5.4    27    38     10.6 0.13
RUG Novembear            89%     4   128  2.03  2.03  0.22   159     158   37.3          6    4.9    0.3  +10.2    59   126     12.4 0.20
RUG Asdf                 89%     4     8  1.17  0.47  0.13   114     114   14.9          1    0.6    1.9  -11.3    46     0      2.8 0.13
RUG the lame duck        88%     4     7  1.11  1.09  0.13   156     156   37.2          2    7.2    0.1   +3.9    13     -     43.7 0.13
RUG MICHI                88%     4   135  2.00  1.99  0.23   216     216   34.7          0    0.0    0.0   +6.4    30   133     68.0 0.22
RUG community coins      88%     4    16  1.01  0.93  0.11   244     244   38.7          0    0.0    0.0   -3.0    23     -     39.5 0.11
RUG The Red Wave         86%     3    50  1.24  1.23  0.17   668     334  103.2         10   17.0    5.9  +12.0    25    48     26.9 0.15
RUG MexicanAIPikachuCo   86%     4    58  1.33  1.00  0.14   207     207   32.8          0    0.0    0.1   -2.7    59     -     29.8 0.14
RUG The Ansem Collecti   85%     2    98  1.71  1.70  0.26   716     358   94.6          2    2.7    0.0  +13.1    22    95      9.8 0.26
RUG Doge-02              84%     4    50  1.20  1.17  0.19   590     334   90.1          0    0.0    0.0   +4.6    27     -     71.1 0.18
RUG Pawket               84%     3    41  1.03  0.89  0.15   278     278   27.0         14    7.3    0.2   -3.3    44     -     45.1 0.14
RUG Waste Management     83%     3   127  2.00  1.66  0.28    86      86   26.8          0    0.0    0.0   -4.1    31     -     32.2 0.28
RUG Doge-02              83%     3    17  1.10  1.03  0.18   636     318   87.3          4   13.6    0.2   +2.2    37     -     94.1 0.18
RUG I'm On               82%     4   143  1.73  1.30  0.23   141     139   25.3          1    0.1    0.0   -1.2    62     -      0.4 0.25
RUG Elon                 82%     4   131  1.40  1.40  0.25   119     119   24.1          0    0.0    0.0   +4.0    14     -      2.0 0.25
RUG alibi                81%     4    48  1.22  0.23  0.21    85      85    1.0          6    0.1    6.6  -22.6   211     1     45.9 0.20
RUG Digital Slop         80%     4    18  1.06  0.76  0.16   214     214   22.8         12    3.4   19.6   -9.7    57    14     18.0 0.15
RUG Artificial Investo   78%     4    54  1.40  1.20  0.26   137     137   20.4          4    2.6    0.8   +0.8    70    33      4.8 0.25
RUG titcoin              77%     4    20  1.14  1.00  0.23   134     134   20.1          7    4.0   10.2   -0.0     6    10     16.3 0.21
RUG Gay And Poor         77%     4    61  1.53  1.46  0.33   111     111   19.9          3    0.3    2.4   +4.6    40    43     39.5 0.28
RUG Spill The Tea        77%     3    51  1.07  1.03  0.24   121     121   19.1          2    0.1    6.1   -0.8     6    47      6.0 0.23
RUG I'm On               76%     4   226  1.37  1.30  0.31   107     107   19.7          1    0.4    0.0   -0.4    55   195      1.7 0.30
RUG Toly                 76%     2    97  1.37  1.28  0.30   100     100   20.2          1    1.0    0.0   +4.6    68     -     41.5 0.30
RUG Elon                 76%     1    14  1.05  1.05  0.25   132     132   17.9          6    4.2    0.0   +1.4    17     -      5.4 0.25
RUG Velum Agent          75%     4     8  1.07  0.85  0.22   158     158   17.3          5    4.2    0.0   -5.1    34     -     44.7 0.22
RUG the lame duck        75%     2    23  1.08  0.36  0.23    78      78    3.8          1    0.1   12.7  -18.2    34    10     11.8 0.22
RUG BULLTRAP             71%     2    21  1.33  1.10  0.32    72      72   16.6          2    1.5    0.1   +2.8    51     -      3.7 0.31
RUG sanctuum             67%     2    11  1.05  1.05  0.34   458     229   45.2          5    5.6    0.0   +2.3     5     -     88.8 0.33
RUG STEPSISTER           66%     2    46  1.06  1.05  0.36   108     108   12.1          4    1.6    0.7   +3.3    31     -     42.5 0.34
RUG fomo.gay             13%     4    47  1.29  1.24  1.10    22      11   11.6          0    0.0    0.0  +17.1    41     -     67.6 0.09
RUG Chrome-Chan          13%     4    31  1.76  1.30  1.20     9       9    3.5          0    0.0    0.0   +9.6    59     -     32.6 0.16
RUG Frontier Inu         11%     4    63  1.20  0.96  0.86     8       8    4.1          0    0.0    1.0   +0.5    75     -      5.4 0.13
RUG relax                10%     4     2  1.03  1.03  0.92    10      10    5.7          0    0.0    0.0   +1.3     0     -     30.0 0.09
RUG Socialcoin           10%     3    13  1.07  1.07  0.96    14       7    7.7          0    0.0    0.1   +4.9     4     -     68.5 0.17
RUG Dodo the Black Swa    6%     4    67  2.23  2.23  2.08    14      14    3.4          1    0.9    2.4  +14.9    22    24     14.4 0.19
RUG Privacy Dog           3%     2    21  1.00  0.99  0.97     4       4    0.4          0    0.0    0.0   -0.1     9     -      2.0 0.30
WIN titcoin              21%     4   294  2.78  2.30  2.19    14       7    4.2          1    0.0    0.0  +12.3    92    95     42.1 5.07
WIN Elon Mosque          18%     4    17  1.34  1.34  1.10    12      12    8.3          0    0.0    0.0  +12.0     7     -     35.0 1.68
WIN Claudecoin           11%     4   174  1.31  1.29  1.15    10      10    5.2          0    0.0    0.0   -0.4    24     -     33.4 3.26
WIN memory coin          11%     4    42  1.36  1.36  1.21     4       4    3.8          4    3.8    7.0   +8.7    12    37     28.3 3.31
WIN This coin is from     8%     3    42  1.28  1.24  1.15    15      15    2.7          0    0.0    7.0   +6.3    14    39     14.9 3.73
WIN The Eagle             8%     4    98  1.83  1.78  1.64    14      14    3.2          0    0.0    0.0   +9.1    48     -     41.0 4.53
WIN Believe               7%     4   142  2.31  2.09  1.96    13      13    3.1          1    0.3    0.4   +8.6    42   122      4.5 3.06
WIN TOYODA                7%     4    11  1.16  1.14  1.09     9       9    2.4          0    0.0    0.0   +5.6    15     -      4.0 2.20
WIN regular inu           3%     4    14  1.21  1.21  1.17     9       9    1.7          1    0.3    0.1   +6.8    11     -     49.1 3.03

Reading: a rug = 75–92% in 2–4 slots (1–1.6 s), sold by 100–400 distinct wallets in 100–700 transactions, 20–127 SOL out. NOT the launch bundle (0–14 of the sellers, 0–20 SOL). The sellers are the first-minute "buyers" that made the coin pass the buying bar: each bought once, 0.1–0.3 SOL, 20–100 s after launch, never sold until the one slot in which all sold. No warning in the flow: price at/near its high on 30 of 37, net flow positive, few sellers; a launch-group sale precedes the dump on 15 of 37 and also precedes nothing on 4 of 9 runners. Runners' worst 3-slot drop: 3–21%, 4–15 sellers.

### 5c. The wallet farm
big-dump rugs 37 winners 9
distinct dump-seller wallets 5540 | wallets seen dumping in 1/2/3/4+ coins: 4357 1023 131 29

per rug: dumpers, of which seen in another rug dump, and their buy profile (when they bought, size, buys per wallet)
  Elon Mosque        dumpers 386 reused 229 (59%) | their buys: n=637 buy time after launch s: [23.0, 73.0, 94.0] size SOL: [0.099, 0.201, 0.305] buys/wallet median 2
  The Ansem Collecti dumpers 358 reused   1 (0%) | their buys: n=729 buy time after launch s: [35.0, 75.0, 122.0] size SOL: [0.098, 0.198, 0.283] buys/wallet median 2.0
  Doge-02            dumpers 334 reused 224 (67%) | their buys: n=620 buy time after launch s: [27.0, 46.0, 72.0] size SOL: [0.101, 0.208, 0.296] buys/wallet median 2
  The Red Wave       dumpers 334 reused 155 (46%) | their buys: n=668 buy time after launch s: [23.0, 51.0, 73.75] size SOL: [0.098, 0.196, 0.296] buys/wallet median 2.0
  Doge-02            dumpers 318 reused   2 (1%) | their buys: n=554 buy time after launch s: [41.0, 56.0, 68.0] size SOL: [0.099, 0.196, 0.347] buys/wallet median 2
  Pawket             dumpers 278 reused  82 (29%) | their buys: n=348 buy time after launch s: [25.0, 49.0, 75.75] size SOL: [0.047, 0.083, 0.099] buys/wallet median 1.0
  Elon Mosque        dumpers 253 reused 111 (44%) | their buys: n=284 buy time after launch s: [34.0, 60.0, 79.0] size SOL: [0.109, 0.2, 0.299] buys/wallet median 1
  Elon Musk          dumpers 246 reused 155 (63%) | their buys: n=269 buy time after launch s: [38.5, 77.0, 117.0] size SOL: [0.098, 0.198, 0.293] buys/wallet median 1.0
  community coins    dumpers 244 reused 110 (45%) | their buys: n=226 buy time after launch s: [32.0, 53.0, 68.0] size SOL: [0.118, 0.202, 0.312] buys/wallet median 1.0
  fomo.gay           dumpers 243 reused   2 (1%) | their buys: n=352 buy time after launch s: [39.25, 69.0, 108.0] size SOL: [0.134, 0.222, 0.347] buys/wallet median 1
  the lame duck      dumpers 238 reused 153 (64%) | their buys: n=358 buy time after launch s: [30.0, 60.0, 91.0] size SOL: [0.112, 0.198, 0.298] buys/wallet median 1.0
  sanctuum           dumpers 229 reused   0 (0%) | their buys: n=348 buy time after launch s: [29.0, 39.0, 58.0] size SOL: [0.049, 0.098, 0.147] buys/wallet median 2
  Lock Inu           dumpers 218 reused   4 (2%) | their buys: n=223 buy time after launch s: [36.0, 68.0, 98.0] size SOL: [0.124, 0.215, 0.321] buys/wallet median 1
  MICHI              dumpers 216 reused 124 (57%) | their buys: n=203 buy time after launch s: [48.0, 95.0, 144.0] size SOL: [0.098, 0.188, 0.275] buys/wallet median 1
  Digital Slop       dumpers 214 reused   4 (2%) | their buys: n=253 buy time after launch s: [19.5, 43.0, 66.5] size SOL: [0.061, 0.098, 0.159] buys/wallet median 1.0
  MexicanAIPikachuCo dumpers 207 reused 143 (69%) | their buys: n=203 buy time after launch s: [36.0, 66.0, 94.0] size SOL: [0.099, 0.2, 0.358] buys/wallet median 1
  MooToon            dumpers 204 reused 108 (53%) | their buys: n=211 buy time after launch s: [23.0, 45.0, 73.0] size SOL: [0.107, 0.198, 0.315] buys/wallet median 1.0
  Squeeze            dumpers 202 reused 144 (71%) | their buys: n=202 buy time after launch s: [46.0, 63.0, 87.0] size SOL: [0.13, 0.245, 0.407] buys/wallet median 1.0
  Velum Agent        dumpers 158 reused  75 (47%) | their buys: n=161 buy time after launch s: [24.0, 43.0, 68.5] size SOL: [0.049, 0.099, 0.172] buys/wallet median 1.0
  Novembear          dumpers 158 reused  57 (36%) | their buys: n=178 buy time after launch s: [48.5, 98.5, 159.0] size SOL: [0.081, 0.139, 0.253] buys/wallet median 1.0
  the lame duck      dumpers 156 reused 113 (72%) | their buys: n=121 buy time after launch s: [23.5, 40.0, 69.0] size SOL: [0.111, 0.219, 0.376] buys/wallet median 1
  I'm On             dumpers 139 reused   5 (4%) | their buys: n=163 buy time after launch s: [53.0, 110.0, 169.0] size SOL: [0.084, 0.171, 0.252] buys/wallet median 1
  Artificial Investo dumpers 137 reused   2 (1%) | their buys: n=143 buy time after launch s: [37.0, 66.0, 90.0] size SOL: [0.098, 0.196, 0.296] buys/wallet median 1
  titcoin            dumpers 134 reused  82 (61%) | their buys: n=134 buy time after launch s: [14.0, 32.5, 56.0] size SOL: [0.099, 0.205, 0.297] buys/wallet median 1.0
  Elon               dumpers 132 reused  78 (59%) | their buys: n=134 buy time after launch s: [17.0, 35.0, 59.0] size SOL: [0.108, 0.196, 0.257] buys/wallet median 1.0
  Spill The Tea      dumpers 121 reused  77 (64%) | their buys: n=145 buy time after launch s: [20.0, 44.0, 75.5] size SOL: [0.098, 0.196, 0.293] buys/wallet median 1
  Elon               dumpers 119 reused  79 (66%) | their buys: n=187 buy time after launch s: [34.0, 68.0, 120.0] size SOL: [0.098, 0.198, 0.294] buys/wallet median 1
  Asdf               dumpers 114 reused  65 (57%) | their buys: n=123 buy time after launch s: [17.0, 38.0, 61.0] size SOL: [0.079, 0.166, 0.285] buys/wallet median 1.0
  Gay And Poor       dumpers 111 reused  39 (35%) | their buys: n=146 buy time after launch s: [24.5, 43.0, 92.0] size SOL: [0.098, 0.155, 0.257] buys/wallet median 1
  MICHI              dumpers 109 reused  65 (60%) | their buys: n=277 buy time after launch s: [50.5, 80.0, 120.0] size SOL: [0.085, 0.13, 0.213] buys/wallet median 2
  STEPSISTER         dumpers 108 reused   2 (2%) | their buys: n=95 buy time after launch s: [40.0, 66.0, 98.0] size SOL: [0.097, 0.154, 0.245] buys/wallet median 1.0
  I'm On             dumpers 107 reused   7 (7%) | their buys: n=163 buy time after launch s: [61.0, 162.0, 235.0] size SOL: [0.097, 0.148, 0.474] buys/wallet median 1
  Toly               dumpers 100 reused   0 (0%) | their buys: n=130 buy time after launch s: [55.0, 114.0, 146.25] size SOL: [0.098, 0.196, 0.284] buys/wallet median 1.0
  Waste Management   dumpers  86 reused   2 (2%) | their buys: n=45 buy time after launch s: [27.5, 162.0, 173.5] size SOL: [0.202, 0.475, 0.777] buys/wallet median 1
  alibi              dumpers  85 reused   1 (1%) | their buys: n=112 buy time after launch s: [35.25, 62.5, 87.0] size SOL: [0.044, 0.068, 0.098] buys/wallet median 1
  the lame duck      dumpers  78 reused  49 (63%) | their buys: n=81 buy time after launch s: [29.0, 51.0, 65.0] size SOL: [0.098, 0.148, 0.243] buys/wallet median 1.0
  BULLTRAP           dumpers  72 reused  40 (56%) | their buys: n=80 buy time after launch s: [18.25, 39.5, 67.0] size SOL: [0.067, 0.148, 0.314] buys/wallet median 1.0

farm = wallets that dumped 2+ rugs: 1183
coin                 class  buyers<=60s  farm among them  farm share of SOL<=60s
  Sam Apeman         MID     230        5 (2%)    2.3%   exit 0.71
  United States of E MID     223        3 (1%)    1.0%   exit 0.57
  Chiplon Musk       MID     235        1 (0%)    0.1%   exit 0.57
  fomo.gay           MID     247        3 (1%)    0.8%   exit 0.95
  Chrome-Chan        MID     208        4 (2%)    0.6%   exit 0.95
  Elon Musk          MID     277       46 (17%)   15.1%   exit 0.75
  Community Coin     MID     325        2 (1%)    0.2%   exit 0.94
  MarsCoin           MID     134        6 (4%)    1.3%   exit 0.45
  donuld tremp       MID     316        5 (2%)    0.9%   exit 0.96
  Elon               MID     260       67 (26%)   38.7%   exit 0.93
  Elon Mosque        MID     229       80 (35%)   38.1%   exit 0.96
  Spill The Tea      MID     217       64 (29%)   42.8%   exit 0.95
  Magical Unicorn    MID     201       68 (34%)   35.2%   exit 0.96
  CATFISH            MID     301       44 (15%)    7.2%   exit 0.59
  Unstoppable Intern MID     158       50 (32%)   43.6%   exit 0.95
  Jackass Coin       MID     260        3 (1%)    2.3%   exit 0.56
  Gay And Poor 500   MID     247       62 (25%)   30.8%   exit 0.96
  Believe            MID     153       21 (14%)   15.1%   exit 0.92
  Privacy Dog        RUG     250        2 (1%)    0.2%   exit 0.30
  fomo.gay           RUG     331        5 (2%)    1.2%   exit 0.10
  STEPSISTER         RUG     123        2 (2%)    0.5%   exit 0.34
  community coins    RUG     306       64 (21%)   15.8%   exit 0.11
  Elon Mosque        RUG     301       62 (21%)   16.8%   exit 0.10
  Doge-02            RUG     207        4 (2%)    0.2%   exit 0.18
  Socialcoin         RUG     244        8 (3%)    3.1%   exit 0.17
  The Ansem Collecti RUG     197        0 (0%)    0.0%   exit 0.26
  Chrome-Chan        RUG     154        7 (5%)    1.7%   exit 0.16
  Digital Slop       RUG     360        5 (1%)    0.8%   exit 0.15
  Elon               RUG     261       81 (31%)   30.6%   exit 0.25
  MooToon            RUG     306       94 (31%)   25.9%   exit 0.13
  Toly               RUG     162        5 (3%)    5.4%   exit 0.30
  Asdf               RUG     254       90 (35%)   35.5%   exit 0.13
  titcoin            RUG     201       76 (38%)   47.6%   exit 0.21
  Doge-02            RUG     216      130 (60%)   47.8%   exit 0.18
  sanctuum           RUG     196        1 (1%)    0.1%   exit 0.33
  Elon Mosque        RUG     134       72 (54%)   49.4%   exit 0.12
  fomo.gay           RUG     167       58 (35%)   45.1%   exit 0.09
  MICHI              RUG     225       59 (26%)   29.0%   exit 0.20
  MICHI              RUG     150       50 (33%)   30.6%   exit 0.22
  Spill The Tea      RUG     196       74 (38%)   46.3%   exit 0.23
  the lame duck      RUG     174       65 (37%)   45.7%   exit 0.22
  the lame duck      RUG     193       78 (40%)   43.6%   exit 0.13
  the lame duck      RUG     396      160 (40%)   44.7%   exit 0.10
  MexicanAIPikachuCo RUG     194       85 (44%)   50.2%   exit 0.14
  Squeeze            RUG     220       98 (45%)   49.8%   exit 0.14
  Pawket             RUG     378       53 (14%)    9.1%   exit 0.14
  Velum Agent        RUG     306       54 (18%)   10.6%   exit 0.22
  Elon               RUG     199       77 (39%)   44.1%   exit 0.25
  Dodo the Black Swa RUG     131       46 (35%)   44.5%   exit 0.19
  The Red Wave       RUG     259      104 (40%)   33.1%   exit 0.15
  Gay And Poor       RUG     115       20 (17%)   17.6%   exit 0.28
  Lock Inu           RUG     215        3 (1%)    0.5%   exit 0.17
  Elon Musk          RUG     231       63 (27%)   23.3%   exit 0.19
  Novembear          RUG     153       28 (18%)   21.3%   exit 0.20
  BULLTRAP           RUG     155       32 (21%)   24.3%   exit 0.31
  relax              RUG     384        7 (2%)    0.7%   exit 0.09
  Waste Management   RUG      75        3 (4%)    0.6%   exit 0.28
  I'm On             RUG     160        2 (1%)    0.3%   exit 0.25
  I'm On             RUG     121        5 (4%)    3.2%   exit 0.30
  alibi              RUG     298        3 (1%)    0.6%   exit 0.20
  Artificial Investo RUG     246        6 (2%)    0.9%   exit 0.25
  Frontier Inu       RUG     145        5 (3%)    0.5%   exit 0.13
  memory coin        WIN      87        2 (2%)    1.3%   exit 3.31
  This coin is from  WIN     204        4 (2%)    1.2%   exit 3.73
  titcoin            WIN     172        8 (5%)    4.5%   exit 5.07
  The Eagle          WIN     126       12 (10%)    2.3%   exit 4.53
  Elon Mosque        WIN     155       11 (7%)    1.7%   exit 1.68
  regular inu        WIN     198        5 (3%)    0.4%   exit 3.03
  TOYODA             WIN     281        8 (3%)    1.0%   exit 2.20
  Believe            WIN     171       21 (12%)   11.6%   exit 3.06
  Claudecoin         WIN     149        1 (1%)    0.3%   exit 3.26

### 5d. Entry-time test WITHOUT look-ahead (farm = wallets seen dumping an EARLIER coin today; pax = wallets with exactly one 0.04–0.5 SOL buy and nothing else by 60 s)
time-ordered; 'farm known' = first-60-s buyers already seen dumping an EARLIER coin today (no look-ahead); 'pax' = wallets with exactly one buy of 0.04–0.5 SOL and nothing else by 60 s
cls name               buyers   pax  pax% farmKnown  farm% exit
MID Sam Apeman            230   171   74%         0     0%  0.71
MID United States of E    223   182   82%         0     0%  0.57
RUG Privacy Dog           250   203   81%         0     0%  0.30
MID Chiplon Musk          235   164   70%         0     0%  0.57
MID fomo.gay              247   205   83%         0     0%  0.95
RUG fomo.gay              331   276   83%         0     0%  0.10
RUG STEPSISTER            123    68   55%         0     0%  0.34
MID Chrome-Chan           208   171   82%        74    36%  0.95
RUG community coins       306   270   88%         3     1%  0.11
WIN memory coin            87    52   60%         1     1%  3.31
RUG Elon Mosque           301   267   89%       117    39%  0.10
MID Elon Musk             277   222   80%       166    60%  0.75
RUG Doge-02               207     2    1%         2     1%  0.18
MID Community Coin        325     7    2%       149    46%  0.94
RUG Socialcoin            244    15    6%       118    48%  0.17
RUG The Ansem Collecti    197     9    5%         0     0%  0.26
WIN This coin is from     204   141   69%       107    52%  3.73
RUG Chrome-Chan           154   105   68%         2     1%  0.16
RUG Digital Slop          360   186   52%         4     1%  0.15
MID MarsCoin              134    42   31%         7     5%  0.45
MID donuld tremp          316   261   83%       109    34%  0.96
RUG Elon                  261   224   86%         2     1%  0.25
MID Elon                  260   195   75%        61    23%  0.93
RUG MooToon               306   231   75%        67    22%  0.13
RUG Toly                  162    46   28%         6     4%  0.30
RUG Asdf                  254   191   75%       118    46%  0.13
WIN titcoin               172    61   35%         9     5%  5.07
RUG titcoin               201   163   81%       112    56%  0.21
RUG Doge-02               216     2    1%         5     2%  0.18
RUG sanctuum              196     3    2%         1     1%  0.33
MID Elon Mosque           229     4    2%       115    50%  0.96
RUG Elon Mosque           134     2    1%        71    53%  0.12
RUG fomo.gay              167     2    1%       121    72%  0.09
RUG MICHI                 225     7    3%         7     3%  0.20
RUG MICHI                 150   119   79%        27    18%  0.22
MID Spill The Tea         217   143   66%        94    43%  0.95
RUG Spill The Tea         196   134   68%        82    42%  0.23
RUG the lame duck         174   113   65%        94    54%  0.22
RUG the lame duck         193   147   76%        10     5%  0.13
RUG the lame duck         396   348   88%        94    24%  0.10
RUG MexicanAIPikachuCo    194   132   68%       103    53%  0.14
MID Magical Unicorn       201   140   70%       121    60%  0.96
WIN The Eagle             126    31   25%        12    10%  4.53
RUG Squeeze               220   164   75%       153    70%  0.14
RUG Pawket                378   180   48%         9     2%  0.14
RUG Velum Agent           306    98   32%       151    49%  0.22
WIN Elon Mosque           155    80   52%        14     9%  1.68
RUG Elon                  199   127   64%       131    66%  0.25
MID CATFISH               301   117   39%       172    57%  0.59
MID Unstoppable Intern    158    69   44%       102    65%  0.95
RUG Dodo the Black Swa    131    59   45%        86    66%  0.19
WIN regular inu           198    85   43%         5     3%  3.03
MID Jackass Coin          260    39   15%         5     2%  0.56
RUG The Red Wave          259     2    1%        10     4%  0.15
RUG Gay And Poor          115     0    0%         5     4%  0.28
MID Gay And Poor 500      247   195   79%       133    54%  0.96
RUG Lock Inu              215   168   78%         9     4%  0.17
RUG Elon Musk             231   167   72%       128    55%  0.19
RUG Novembear             153    79   52%        31    20%  0.20
WIN TOYODA                281   180   64%        13     5%  2.20
RUG BULLTRAP              155    72   46%        67    43%  0.31
RUG relax                 384   330   86%       147    38%  0.09
MID Believe               153    53   35%        66    43%  0.92
WIN Believe               171    68   40%        74    43%  3.06
RUG Waste Management       75    28   37%         5     7%  0.28
WIN Claudecoin            149   111   74%         3     2%  3.26
RUG I'm On                160    59   37%         5     3%  0.25
RUG I'm On                121    29   24%        10     8%  0.30
RUG alibi                 298   139   47%         7     2%  0.20
RUG Artificial Investo    246   160   65%        11     4%  0.25
RUG Frontier Inu          145    30   21%        41    28%  0.13
WIN n 9 pax% quartiles [38, 52, 67] pax count quartiles [56, 80, 126] farm% quartiles [2, 5, 26]
MID n 18 pax% quartiles [34, 70, 81] pax count quartiles [50, 154, 195] farm% quartiles [1, 39, 55]
RUG n 44 pax% quartiles [22, 53, 76] pax count quartiles [28, 116, 177] farm% quartiles [2, 7, 48]
REJECT if farm-known share >= 10%   : rejects 35 (rugs 21, winners 2) | keeps 36 (rugs 23, winners 7)
REJECT if farm-known share >= 5%    : rejects 42 (rugs 24, winners 5) | keeps 29 (rugs 20, winners 4)
REJECT if pax >= 120                : rejects 34 (rugs 21, winners 2) | keeps 37 (rugs 23, winners 7)
REJECT if pax share >= 60%          : rejects 35 (rugs 21, winners 3) | keeps 36 (rugs 23, winners 6)
all reconstructed entries                    n=62 win=5 rugs=39 true@0.02=-0.5551 no-best=-0.6242
U filter                                     n=16 win=2 rugs=6 true@0.02=+0.0048 no-best=-0.0643
farm-known < 10% (no look-ahead)             n=31 win=4 rugs=20 true@0.02=-0.2083 no-best=-0.2774
U + farm < 10%                               n= 5 win=2 rugs=1 true@0.02=+0.1038 no-best=+0.0347
FDL                                          n=48 win=4 rugs=28 true@0.02=-0.4109 no-best=-0.4741
FDL + U                                      n=11 win=1 rugs=3 true@0.02=-0.0019 no-best=-0.0651
FDL + U + farm < 10%                         n= 3 win=1 rugs=1 true@0.02=+0.0449 no-best=-0.0184
removed by farm from FDL+U: [('Chrome-Chan', 'MID', 0.36), ('donuld tremp', 'MID', 0.34), ('titcoin', 'RUG', 0.56), ('Spill The Tea', 'MID', 0.43), ('Spill The Tea', 'RUG', 0.42), ('Magical Unicorn', 'MID', 0.6), ('Unstoppable Intern', 'MID', 0.65), ('BULLTRAP', 'RUG', 0.43)]

Reading: with hindsight the farm share of first-minute buyers separates (rugs 14–60%, winners 1–12%); without it (list empty at the start of the day) it does not yet: rejecting ≥ 10% removes 21 rugs and 2 winners (This coin is from 2027 had 107 known farm wallets among its buyers and ran 6.85x), keeps 23 rugs and 7 winners. The farm buys runners too; what differs is whether it dumps. The passenger fingerprint does not separate.

## 6. Entry filters tested (true 0.02 fees; first entry per coin; Codex's and Gemini's results reproduced on the mint-level data)
- Holders < 200 alone (84): keeps 7 of 10 winners, removes 35 of 54 rugs, +0.044 (reported scale).
- Holders < 200 & mc < $15K (84): 29 trades, 6 winners, 17 rugs, +0.065 reported / +0.026 true; no-best −0.043; before 14:30 +0.19 (5 winners), from 14:30 −0.12 (1 winner).
- + holders < chain buys (Gemini's off-curve-transfer test; mechanism: every holder on a curve needed a buy): 26 trades, 6 winners, 14 rugs, +0.075 true, no-best +0.002; removes STEPSISTER (182 holders / 127 buys), Chrome-Chan (198/155), Waste Management (143/80).
- Per base book + both tests, true fees: FDL + U 17 trades, 5 winners, 10 rugs, +0.104 (no-best −0.003); FD + U 9, 3, 6, +0.067 (no-best −0.004); FDB/FDH + U 13, 4, 9, +0.084; A1 + U 18, 4, 10, +0.038. The filter's winners are FDL's: Sol Village and Deadpool Pony were FDL-only entries (Deadpool had 220 holders by FD's check a minute later), The Eagle unfunded (FDB/A1/FDH only).
- + no earlier entry of the same name by any book (Gemini): FDL + U + this 13 trades, 5 winners, 6 rugs, +0.169, no-best +0.063. The generic "same name launched in the last hour" count does NOT work (winners have it: The Eagle 7, titcoin 3) — the tell is a copy of a coin that already passed our bar.
- Holders ≤ 10 × buyers (Claude's first ratio idea): −0.18, drops Deadpool and This coin — withdrawn.
- Timing: FD120 (entry at 120 s) won 26% vs FD's 14% on the same coins, −0.08 vs −0.22 SOL; survivorship plus buying every runner a minute higher (Deadpool 6.4x → 4.4x; regular inu 3.0x → 1.5x); 27 trades; the filter cannot be applied at 120 s (23 of 25 coins had ≥ 210 holders by then, incl. every runner) — a 120-s variant must decide at 60 s and only delay the fill.
- Template exclusion: no. Exit changes: no (section 4, confirmed by 5b).

## 7. Conclusions
1. Winners pay 2–10x; rugs cost 75–87% each because the dump is one slot of 100–400 wallets selling together. At 5.4 rugs per winner no exit can balance it; at roughly 2.9 per winner it breaks even. The whole problem is who we buy.
2. The buying bar selects the farm's own pump. The funded-dev test does not change that. "Uncrowded" (few holders, small cap, holders below buys) works because a farm pump is a crowd by construction — it keeps the runners that were bought by few real wallets early.
3. No price/flow warning precedes the dump. Exit rules are closed as a line of work. The 40% trail stays (runner-friendly); half-at-2x is scored beside it as a column only.
4. The farm's wallet list is the feature that improves with time: today it started empty. Carried across days, "share of first-minute buyers already seen in a dump" is the next column to log on every check — never a rule until it has a week of out-of-sample data.
5. Everything above is 84 coins from one afternoon; thresholds were drawn after looking; five of the six filter winners came before 14:30. Candidate, not edge.

## 8. What is running now (nothing else changes until the owner says)
- Live FD OFF (0 open). Simulated books FDLU (FDL bar + holders < 200 + mc < $15K + holders < chain buys, all at the 60-s check), FDU (FD bar + same), FDLU120/FDU120 (decide at 60 s, fill 60 s later). All four skip the fill if the reserve price is ≤ 0.7 × the check price (logged as skipped-dump, zero return, distinct from a missing result). Every existing book unchanged beside them. One entry per mint per book was already the rule; the duplicate names in the live book were different mints launched under the same name.
- Columns logged: true-fee r at 0.02, half-at-2x, holder growth 60 → 120 s, same-name copy (earlier mint + minutes). Reports per book: today / 6 h / 24 h / total, net at true fees, without best, half-at-2x.
- Data preserved from now: every trade (wallet, slot, signature, SOL, tokens, price) of any launch reaching 15 SOL of buys, for 30 min; exported for the books' coins. Not yet: bot-received timestamps, token transfers (needs a token-program subscription), bundle-wallet selling (switch back on).
- Proposed next: farm_wallets table (every wallet that sold in a ≥ 60%, ≤ 4-slot dump of a coin the books entered, with date), farm_share on every check, nightly reconstruction so the list grows.
- Live again only as a defined test: fixed budget (0.2 SOL), rules frozen, FDLU, after ≥ 3 days and ≥ 100 U entries positive by day and without the best at true fees, with reconciled costs.

## 9. Questions for Gemini
1. Is anything above wrong, inconsistent between sections, or overstated? Quote the line.
2. Given 5b (the dump is 100–400 one-buy wallets selling in one slot, no flow warning), is there any exit or warning we have not tested that could work? If not, say so plainly.
3. On the farm list without look-ahead (5d): the share also flags runners (This coin 52%, Believe 43%). Is there a better way to use wallet identity at entry — e.g. only wallets with ≥ 2 prior dumps, or weighting by what they did on the coins they did not dump?
4. The same-name test: "a copy of a coin that already passed our bar" vs "any same-name launch in the hour". Do you agree with the distinction, and should it be a rule or a column?
5. Anything in the check-row behaviour (5a: net buying growth 60 → 90 s, sellers/exited counts) that should become a 90-s confirmation step before the fill?
6. What would you change in section 8 before we let it run for three days?

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
