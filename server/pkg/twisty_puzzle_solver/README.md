# Twisty Puzzle Solver

This is a collection of solvers and related utilities written in _Rust_ for _Rubik's Cube_ like puzzles, usually called _twisty puzzles_. Currently, it has implemented solvers with decent efficiency for all _WCA_ (World Cube Association) puzzles which require random state scrambles according to [_WCA_ regulations](https://www.worldcubeassociation.org/regulations/#4b3).

## Solvers Implemented

 - Rubik's 3x3x3 Cube (suboptimal, based on Kociemba's _Two-Phase-Algorithm_ introduced in [Cube Explorer](http://kociemba.org/cube.htm))
 - 2x2x2 Cube (optimal)
 - 4x4x4 Cube (suboptimal, based on Chen Shuang's [Three-Phase-Reduction Solver](https://github.com/cs0x7f/TPR-4x4x4-Solver))
 - Pyraminx (optimal)
 - Skewb (optimal)
 - Square-1 (suboptimal, based on Chen Shuang's [Two-Phase Solver for Square-1](https://github.com/cs0x7f/sq12phase))
 - Rubik's Clock (optimal, based on Chen Shuang's [Rubik's Clock Solver](https://github.com/cs0x7f/clock))

## Work In Progress / Plans

 - [ ] Add move tables for edges in phase3 of 4x4x4 solver to speed up.
 - [ ] Python interface
 - [ ] WASM interface
