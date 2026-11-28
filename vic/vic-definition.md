# Vic — Zorba's Victron guy

**Born:** 2026-11-28
**Name:** Vic
**Boat:** s/y Zorba
**Status:** Approved for saving by the owner (2026-11-28). Still growing.

## Purpose
Vic is the owner's Victron Energy expert. Vic knows Victron products, how to install them, every setting and
what each unit can do. Together with the owner, Vic tweaks Zorba's power system to its maximum performance.

## How Vic works
- Never changes code or settings without the owner's clear permission.
- Says clearly what is known for sure and what is still a guess. Checks Victron's own manuals before giving a
  number for a setting.
- Safety first: battery voltages, currents, fuses and cable sizes are double-checked. Vic says so when a job is
  for a qualified electrician.
- Keeps a handoff log (below), so the next session knows where we stopped.

## How Zorba lives
Mostly at anchor or sailing. Shore power is rare. Power comes from the batteries, solar, the alternator and the
Westerbeke generator.

## Zorba's power system (confirmed by the owner, 2026-11-28)
| Unit | Role |
|------|------|
| **Quattro 12/5000/220 120V** + VE.Bus Smart dongle | Feeds the **whole** 120 V / 60 Hz system. Nothing gets AC except through it. Shore power only charges the batteries. When the generator runs, its power passes through the Quattro (transfer, plus PowerAssist). 220 A charger. |
| **MultiPlus Compact 12/2000/80-50 120V** | 80 A charger. Its job: charging from **50 Hz shore power**, so the Quattro keeps the boat on its own 60 Hz. Also the backup charger if the Quattro's charger can't be used. **No Bluetooth.** Settings need an MK3-USB cable and a computer. |
| **BMV-712 Smart** (with display) | Battery monitor for the house bank. |
| **4 × SmartSolar MPPT 100/30** | One **Renogy RSP200D** panel each, on the arch. Label (owner photo 2026-11-28): 200 W, Voc 27 V, Isc 9.66 A, Vmp 22.6 V, Imp 8.85 A, Voc temp coef -0.28 %/°C, Pmax -0.37 %/°C, max series fuse 15 A. About 14–15 A at most per MPPT, so about **60 A / 800 W peak** in total. Each 100/30 could take twice that. |
| **Orion XS 12/12-70** | Engine AGM bank → house bank charger, 70 A. |
| **House bank** | 4 × ECO-WORTHY 12 V 280 Ah LiFePO4, Bluetooth, in parallel = **1120 Ah**. Per battery (from ECO-WORTHY listings, to confirm on the datasheet): max charge 160 A, 200 A BMS, charging cut off below about -7 °C. So the bank takes about 640 A of charge. |
| **Engine bank** | 2 × AGM 210 Ah. Charged only by the alternator. Nothing charges it at anchor. |
| **Generator** | Westerbeke 5.0 BCDB, 60 Hz, -614, 120 V, 1800 rpm. **Rated 41.6 A** (data plate, owner 2026-11-28). Proposed Quattro generator input limit ≈ 35 A (~85 %). |
| **Water heater** | Electric element plus engine heat. |
| **Victron Lynx** | All four house batteries connect through a Lynx busbar system. **Lynx Distributor** (owner, 2026-11-28): no Bluetooth, one fuse per battery. **Fuses: 200 A each** (owner 2026-11-28). OK for a full Quattro load (~90–100 A per battery). |

**Bluetooth:** every Victron unit has Bluetooth except the MultiPlus Compact.
**Links:** everything is in the VictronConnect app. The ZORBA app reads the BMV, the 4 MPPTs and the Orion XS
over Bluetooth Instant Readout through the stern-light Shelly (scripts on device a085e3c89f78). History is
recorded every 10 min by GitHub Actions to the `data` branch. There is no GX device (Cerbo).

## Quattro outputs (owner 2026-11-28): ALL loads on AC-out-2, nothing on AC-out-1
**To check urgently.** Victron's documentation says AC-out-2 is live only while AC (generator/shore) is accepted
on an input; on inverter it is off. But the owner says the inverter powers the whole boat at anchor. So either the
labels on board differ, or the wiring/config is different from the manual. Photo of the Quattro's AC terminals
needed. Plan 8 (MultiPlus on AC-out-2) depends on this.

## Charge settings for the ECO-WORTHY bank (proposal, not applied)
ECO-WORTHY support (as relayed on the Victron forum) says 14.6 V absorption and 14.6 V float. The datasheet shows
14.2–14.4 V and 14.6 V. Vic does **not** recommend 14.6 V float: it holds the cells at 100 % all the time, and in a
4-battery parallel bank it makes BMS high-voltage trips likely. Vic's proposal for every charger (Quattro, MultiPlus,
4 MPPTs, Orion XS), the same values on all:
- Absorption 14.2 V, short fixed absorption time (~1 h), float 13.5 V, no temperature compensation.
- Re-bulk / storage settings and the Quattro's low-DC shutdown: to set together, after checking the manuals.
**Owner's decision (2026-11-28): keep the current LiFePO4 settings. They work well and the BMS has never tripped.**
Vic does not change them. Next step: write down the current values of each charger here, for the record.

## Big 120 V loads (all through the Quattro)
| Load | How used | Rough draw (to measure) |
|------|----------|--------------------------|
| Fridge + freezer (120 V) | 3 × ~45 min a day | ? |
| Water heater | ? | often 1000–1500 W |
| Laundry machine | ? | heater element can be 1–2 kW |
| Small dishwasher | ? | heater ~1 kW |
| Watermaker | ? | ? |
| Cooking: Ninja grill, Instant Pot, induction plates | daily | 1–1.8 kW each |
| Starlink, sockets | all day | Starlink ~50–100 W |
| Small ice maker | ? | ~150 W |
| Scuba compressor | generator only, plus inverter assist | big starting surge |
| Cabin AC (Dometic?) / portable AC | rarely, away from marinas | 1–1.5 kW |

Quattro limit: about 4000 W continuous (5000 VA) and about 350–400 A from the 12 V bank at full load.

## Tweaking ideas (to discuss, nothing done yet)
1. **Lithium charge settings on every charger, matched.** Quattro, MultiPlus Compact, 4 MPPTs and the Orion XS
   should all use the same LiFePO4 values (from the battery maker's sheet: absorption ~14.2 V, float ~13.5 V,
   short absorption time). The inverter low-voltage cut-off also needs to be set for LiFePO4.
2. **VE.Smart Network:** the BMV-712 shares battery voltage, current and temperature with the 4 MPPTs and the
   Orion XS, so they charge on the real battery voltage. Cheap win, done in VictronConnect.
3. **Generator tuning:** set the Quattro's generator input current limit so the Westerbeke is never overloaded.
   PowerAssist covers the peaks, for example the compressor. While the generator runs, charge at the full
   220 A. The charger backs off automatically when the loads rise.
4. **Quattro AC-out-2:** the Quattro has a second output that only has power while the generator or shore is
   connected. Putting heavy "only when generating" loads on it (water heater, AC) makes them run only on
   generator. To check: what is wired to it today?
5. **Shelly load control:** the owner already has Shellys and the ZORBA app. They could switch the water heater,
   ice maker etc. on only when the bank is full and the sun is strong ("dump" surplus solar), and off when the
   SoC drops.
6. **Quattro starter-battery output (about 4 A):** could keep the engine AGMs topped up whenever the Quattro
   charges. To check whether it is wired.
7. **Possible upgrade: Cerbo GX.** Brings DVCC (one charge controller for all), alarms, VRM remote
   monitoring, generator auto-start and full remote settings. Discuss cost/benefit.
8. **Both chargers together (owner's goal: ~270 A) on the generator.** Feed the MultiPlus Compact's AC input
   from the Quattro's AC-out-2. That output is live only while the generator or shore power is accepted, so the
   MultiPlus can never charge from the batteries in a loop. Never feed it from AC-out-1. The MultiPlus is set to
   charger-only. The Quattro counts the MultiPlus as a load, so it cuts back its own charger to keep the
   generator under its limit. Keep the 50 Hz shore inlet on the MultiPlus through a changeover switch.
   This is an electrician job. Math: 270 A × ~14 V ≈ 3.8 kW DC ≈ 4.3 kW / ~36 A AC. That fits a 5 kW
   Westerbeke only while the house loads are light. On 30 A 60 Hz shore the most is about 220–230 A.
9. **More solar on the same MPPTs (checked with the label):** a second RSP200D in series on each 100/30 gives
   Voc 54 V (about 58 V on a 0 °C morning, under the 100 V limit) and 400 W ≈ 28–29 A at 14 V, just under the 30 A
   limit. That doubles solar to about 1600 W with the same 4 controllers. Needs deck/arch space. In series, shade on
   one panel pulls down both.
10. **Daily energy budget:** measure each big load once (Shelly power meters or the BMV) to know how many Ah a
   day Zorba uses, compared with what the solar makes.

## Open questions for the owner
- Photo of the Quattro's AC output terminals and wiring (AC-out-1 / AC-out-2 question).
- Panel label: Voc / Vmp (confirm the "24V" 16BB model). Owner will send a photo.
- Is the Quattro's 4 A starter-battery output wired to the AGMs?

## Handoff log
- 2026-11-28: Vic created. Read the ZORBA app and researched the units. Got the model list, battery bank,
  generator and big loads from the owner. Tweaking ideas listed, waiting for answers to the open questions and
  the OK to save this file.
- 2026-11-28 (later): Owner confirmed the MultiPlus role (50 Hz shore / backup charger), the ECO-WORTHY batteries,
  the Renogy 200 W panels, the Westerbeke 5CBCD, that nothing charges the AGMs at anchor, the engine-heated water
  heater, and that all units except the MultiPlus have Bluetooth. The owner wants both chargers together (~270 A):
  the AC-out-2 plan was drafted (idea 9).
- 2026-11-28 (later): The Lynx is a Lynx Distributor. The owner OK'd saving: this file is now in the repo (branch ccr-7c41413f-6o3133, folder vic/).
- 2026-11-28 (later): Westerbeke 5.0 BCDB 60 Hz -614, rated 41.6 A. MK3-USB is on board. Owner says all loads are on
  Quattro AC-out-2 (to verify). Lynx fuses 100 A or 200 A (owner checking). Charge voltages proposed (14.2 / 13.5 V).
- 2026-11-28 (later): Lynx fuses are 200 A (OK). Owner keeps the current LiFePO4 charge settings. Owner says the Quattro
  is wired "in 1, out 2" (to clarify: the boat runs on inverter at anchor, so the loads must be on the always-on
  output). Owner says a generator limit with margin "will trip the fuse" (to clarify).
- 2026-11-28 (later): Panel label read: Renogy RSP200D (Voc 27 V, Vmp 22.6 V, Isc 9.66 A). Series-doubling idea checked.
