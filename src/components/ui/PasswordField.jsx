import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import TextField from './TextField';

// Password input with a show/hide button. The button is a real <button> with a
// text label that changes, and aria-pressed so the state is announced.
export default function PasswordField({ onCapsLockChange, ...props }) {
  const [visible, setVisible] = useState(false);

  const checkCapsLock = (event) => {
    onCapsLockChange?.(event.getModifierState?.('CapsLock') ?? false);
  };

  return (
    <TextField
      {...props}
      icon={Lock}
      type={visible ? 'text' : 'password'}
      onKeyUp={checkCapsLock}
      onKeyDown={checkCapsLock}
      onBlur={(event) => {
        onCapsLockChange?.(false);
        props.onBlur?.(event);
      }}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="flex size-10 items-center justify-center rounded-md text-navy-600 hover:bg-navy-50 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-marian-600"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
        </button>
      }
    />
  );
}
