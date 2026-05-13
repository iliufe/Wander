# Wander Demo Day Speaker Notes

## 1. Title
Wander is for the tiny window after class or work when users want to do something nearby, but do not want to plan for 30 minutes first.

## 2. The Problem
Emphasize the quote. The core pain is not lack of places; it is fragmented decision-making across content, maps, reviews and timing.

## 3. What We Built
One sentence: Wander turns a natural-language intention into three real, executable route options around the user.

## 4. Demo Backup
Live demo first. If the network/API fails, use this slide to explain the intended flow: locate, type request, set time and travel mode, generate routes, choose one.

## 5. Validation Evidence
Frame it as before/after. Before, users had to coordinate multiple apps. After, they can keep the planning loop in one product.

## 6. What Testing Changed
Mention three concrete iterations: map-point correction for GPS drift, stronger keyword intent parsing plus real POI scoring, and persistent route generation when switching pages.

## 7. What Comes Next
Be honest: external API latency and quota are still the biggest reliability risk. Next engineering step is a background job queue, POI cache and route-quality monitoring.
