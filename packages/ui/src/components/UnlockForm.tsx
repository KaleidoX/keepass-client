import { useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

export type UnlockFormLabels = {
  title: string;
  databasePath: string;
  chooseFile: string;
  password: string;
  submit: string;
  loading: string;
};

export type UnlockFormProps = {
  labels: UnlockFormLabels;
  selectedPath: string | null;
  isLoading?: boolean;
  error?: string | null;
  onChooseFile: () => void;
  onSubmit: (password: string) => void;
};

export function UnlockForm({ labels, selectedPath, isLoading = false, error, onChooseFile, onSubmit }: UnlockFormProps) {
  const [password, setPassword] = useState('');

  return (
    <Card
      aria-labelledby="unlock-title"
      className="mx-auto w-full max-w-[28rem] border-slate-200/80 bg-card/95 shadow-lg shadow-slate-200/60"
    >
      <CardHeader className="gap-3 pb-2">
        <CardTitle>
          <h1 id="unlock-title" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {labels.title}
          </h1>
        </CardTitle>
        <CardDescription className="text-sm leading-6">{labels.databasePath}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="button" variant="outline" className="h-11 justify-center" disabled={isLoading} onClick={onChooseFile}>
              {labels.chooseFile}
            </Button>
            {selectedPath ? (
              <span className="min-w-0 truncate text-sm font-medium text-slate-700" title={selectedPath}>
                {selectedPath}
              </span>
            ) : null}
          </div>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(password);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="unlock-password">{labels.password}</Label>
            <Input
              id="unlock-password"
              className="h-11 bg-background text-base"
              type="password"
              value={password}
              disabled={isLoading}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
          </div>

          {error ? (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" className="h-11 w-full font-semibold shadow-sm" disabled={isLoading}>
            {isLoading ? labels.loading : labels.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
