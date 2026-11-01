import Logo from '../components/Logo';
import pupilsPhoto from '../assets/pupils.jpg';
import { SCHOOL } from '../utils/config';

// Shared frame for the sign-in screens.
// Desktop: navy brand panel (the crest's colours) beside the form.
// Mobile/tablet: the panel collapses into a header band above the form sheet.
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[5fr_6fr]">
      <aside className="relative hidden overflow-hidden bg-navy-900 text-white lg:flex lg:flex-col">
        {/* A thin pink inner line echoes the double border of the crest's shield. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-5 rounded-2xl border border-blush-300/40"
        />
        <div className="relative flex flex-1 flex-col gap-8 p-12 xl:p-16">
          <div>
            <Logo className="size-24" />
            <p className="mt-6 font-display text-3xl font-black leading-tight xl:text-4xl">{SCHOOL.name}</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="rounded-md bg-blush-300 px-3 py-1 font-display text-sm font-bold text-navy-900">
                {SCHOOL.town}
              </span>
              <span className="text-lg text-navy-100">School Portal</span>
            </div>
            <p className="mt-6 max-w-sm text-lg text-blush-200">{SCHOOL.motto}</p>
          </div>

          <div className="mt-auto">
            {SCHOOL.showLoginPhoto && (
              <img
                src={pupilsPhoto}
                alt="Pupils of the school in their uniforms, smiling on the school lawn"
                className="h-60 w-full rounded-2xl object-cover object-[50%_35%] ring-1 ring-white/20 xl:h-72"
              />
            )}
            <p className="mt-5 max-w-md text-sm leading-relaxed text-navy-100">
              Results, attendance, fees and homework for pupils, parents, teachers and staff, in one place.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col bg-navy-900 lg:bg-white">
        <div className="flex items-center gap-4 px-6 pb-9 pt-7 text-white sm:px-10 lg:hidden">
          <Logo className="size-16" />
          <div>
            <p className="font-display text-lg font-bold leading-tight">{SCHOOL.name}</p>
            <p className="mt-1 text-sm text-blush-200">School Portal, {SCHOOL.town}</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col rounded-t-3xl bg-white lg:rounded-none">
          <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
            <div className="w-full max-w-md">{children}</div>
          </main>
          <footer className="px-6 pb-6 text-center text-sm text-navy-600">
            <p>
              &copy; {new Date().getFullYear()} {SCHOOL.name}, {SCHOOL.town}. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
