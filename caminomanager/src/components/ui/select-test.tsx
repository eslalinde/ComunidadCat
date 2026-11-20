import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

export function SelectTest() {
  const [value, setValue] = React.useState('');

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Select Component Test</h2>

      <div className="space-y-2">
        <label className="text-sm font-medium">Select a fruit:</label>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a fruit..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="orange">Orange</SelectItem>
            <SelectItem value="grape">Grape</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">Selected: {value || 'None'}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Select with groups:</label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Choose an option..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
            <SelectItem value="option3">Option 3</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
