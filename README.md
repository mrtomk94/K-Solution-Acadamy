# K-Solution Academy: Virtual Class

A bilingual (English / Tiếng Việt) virtual class for electrical, control panels, PLC and HMI. It includes:

- **Lessons and quizzes** for 8 sections, from basic electrical to Studio 5000 and HMI.
- **3D Lab**: a walkable classroom with the control panel, conveyor, ADU house wiring and HMI.
- **HMI Lab**: connect, set up tags, draw the operator screen and run it.
- **LogixSim Studio** (`/logixsim/`): VirtualControlStudio, a Studio 5000-style editor with a soft PLC. It runs entirely in the browser (Python + WebAssembly), so students install nothing.

Students open the link and start learning. Progress and saved LogixSim projects stay in their own browser.

## Links

- Class: `https://<user>.github.io/<repo>/`
- LogixSim: `https://<user>.github.io/<repo>/logixsim/`
- LogixSim with the conveyor loaded and running: `.../logixsim/?l5x=KS_P10_Conveyor.L5X&run=1`
- In Vietnamese: add `&lang=vi`

## 3D Lab ↔ LogixSim

1. Open LogixSim in one tab and press Run.
2. In the 3D Lab, open **PLC tags** and pick **LogixSim** (address `browser`).

The two tabs talk over a `BroadcastChannel` on the same site. The 3D field devices write the `IN_*` tags, and the `OUT_*` tags come back from LogixSim.

## Files

| Path | What it is |
|---|---|
| `index.html` | the virtual class (single file) |
| `vendor/three.min.js` | three.js r128 (MIT) |
| `logixsim/index.html`, `logixsim/js/` | VirtualControlStudio Studio UI |
| `logixsim/boot.js` | browser host: runs the engine, answers `/api/*` in-process, 3D Lab bridge |
| `logixsim/vcs_py.zip` | VirtualControlStudio Python package + small browser stand-ins for fastapi / lxml / pydantic |
| `logixsim/pyodide/` | Pyodide (Python for WebAssembly, MPL-2.0) |
| `logixsim/examples/` | KS_P10_Conveyor, KS_P20_ADU_House, Line1 (.L5X) |

## Trademarks

Studio 5000, Logix Designer, RSLogix, CompactLogix, ControlLogix, FactoryTalk and Logix Echo are trademarks of Rockwell Automation, Inc. VirtualControlStudio and K-Solution Academy are independent projects. They are not affiliated with, endorsed by or sponsored by Rockwell Automation.
