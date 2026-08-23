# Level 1 world asset sources

## KSQL Airport

Level 1 uses a local browser adaptation of **KSQL Airport** (San Carlos
Airport / Baylands), published by **OpenRobotics** and credited by its
`model.config` to **Cole Biesemeyer**.

- Source page: <https://fuel.gazebosim.org/1.0/OpenRobotics/models/ksql_airport>
- Source archive: <https://fuel.gazebosim.org/1.0/OpenRobotics/models/ksql_airport.zip>
- License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
- Required attribution: **KSQL Airport by OpenRobotics and Cole Biesemeyer,
  CC BY 4.0**

The original archive contains `SanCarlosAirport_Terrain.DAE`,
`SanCarlosAirport_Buildings.DAE`, and a 3328 × 3328
`SanCarlosAirport_Sat.png` texture. For this browser build:

- the two COLLADA meshes were converted to binary glTF with AssimpJS 0.0.10;
- the satellite PNG was re-encoded as an optimized quality-84 JPEG;
- source scale and geometry were retained, with a runtime vertical offset for
  Babylon.js.

These are format and payload-size changes only. The game serves all derivatives
locally and makes no runtime request to Gazebo Fuel.

| Local derivative | Size | SHA-256 |
| --- | ---: | --- |
| `ksql-airport/ksql-buildings.glb` | 12,434,084 B | `20cb3a9918288ad61b56d3c5e9106856777064550dae5e875da8a4b4df841629` |
| `ksql-airport/ksql-terrain.glb` | 2,276,476 B | `d09d9a095e5fd06ebbcf2c6ce15177b7e32a4ac6f8da775fcb8a5c8c122cc0a4` |
| `ksql-airport/textures/ksql-airport-texture.jpg` | 4,313,897 B | `21001e5d4491b10a5f8100d9d6cf8f1544044f2b090c48328f808b12cf1dda5b` |
