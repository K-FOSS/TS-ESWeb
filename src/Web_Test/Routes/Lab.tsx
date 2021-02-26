// src/Web_Test/Routes/Lab.tsx
import { ChangeEvent, ReactElement, useCallback, useState } from 'react';

enum LabMode {
  IMPORT_PROP_TYPES = 'importPropTypes',
}

export default function LabRoute(): ReactElement {
  const [lab, setLab] = useState<LabMode>(LabMode.IMPORT_PROP_TYPES);

  const runLab = useCallback(async () => {
    switch (lab) {
      case LabMode.IMPORT_PROP_TYPES:
        console.log(await import('prop-types/factoryWithTypeCheckers'));
    }
  }, [lab]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => console.log(event),
    [setLab],
  );

  return (
    <>
      <h1>Lab Route</h1>

      <label htmlFor="lab-select">Choose a Lab Mode:</label>

      <select name="lab" id="lab-select" value={lab} onChange={handleChange}>
        {Object.keys(LabMode).map((labMode) => (
          <option value={labMode} key={labMode}>
            {LabMode[labMode]}
          </option>
        ))}
      </select>

      <button onClick={runLab}>Run Lab</button>
    </>
  );
}
