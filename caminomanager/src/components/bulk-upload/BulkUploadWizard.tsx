'use client';

import { Fragment, useState, useCallback, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CarismaBadge } from '@/components/ui/carisma-badge';
import { Stepper, type StepperItem } from '@/components/ui/stepper';
import { Progress } from '@/components/ui/progress';
import { FormAlert } from '@/components/ui/form-alert';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  ParsedBrother,
  parseCsvFile,
  downloadCsvTemplate,
  validateBrothersForUpload,
} from '@/lib/csv-parser';
import {
  executeBulkUpload,
  UploadProgress,
  UploadResult,
} from '@/lib/bulk-upload-service';
import { CARISMA_GROUP_ORDER } from '@/config/carisma';

interface BulkUploadWizardProps {
  open: boolean;
  onClose: () => void;
  communityId: number;
  communityNumber: string;
  onComplete: () => void;
}

type WizardStep = 'upload' | 'review' | 'responsables' | 'confirm';

const STEP_LABELS: Record<WizardStep, string> = {
  upload: 'Cargar Archivo',
  review: 'Revisar Datos',
  responsables: 'Responsables',
  confirm: 'Confirmar',
};

const STEPS: WizardStep[] = ['upload', 'review', 'responsables', 'confirm'];
const STEPPER_ITEMS: StepperItem[] = STEPS.map((step) => ({
  id: step,
  label: STEP_LABELS[step],
}));

export function BulkUploadWizard({
  open,
  onClose,
  communityId,
  communityNumber,
  onComplete,
}: BulkUploadWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [brothers, setBrothers] = useState<ParsedBrother[]>([]);
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetWizard = useCallback(() => {
    setCurrentStep('upload');
    setBrothers([]);
    setGlobalErrors([]);
    setIsParsing(false);
    setIsUploading(false);
    setUploadProgress(null);
    setUploadResult(null);
    setFileName('');
  }, []);

  const handleClose = useCallback(() => {
    if (isUploading) return;
    resetWizard();
    onClose();
  }, [isUploading, onClose, resetWizard]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setIsParsing(true);
      setFileName(file.name);
      try {
        const result = await parseCsvFile(file);
        setBrothers(result.brothers);
        setGlobalErrors(result.errors);
        if (result.errors.length === 0 && result.brothers.length > 0) {
          setCurrentStep('review');
        }
      } finally {
        setIsParsing(false);
      }
    },
    []
  );

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv') {
        handleFileSelect(file);
      } else {
        setFileName(file.name);
        setBrothers([]);
        setGlobalErrors([
          'El archivo debe ser .csv. En Excel usa "Guardar como" → "CSV UTF-8 (delimitado por comas)".',
        ]);
      }
    },
    [handleFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDeleteRow = useCallback((rowIndex: number) => {
    setBrothers((prev) => prev.filter((b) => b.rowIndex !== rowIndex));
  }, []);

  const handleToggleResponsable = useCallback((rowIndex: number) => {
    setBrothers((prev) =>
      prev.map((b) =>
        b.rowIndex === rowIndex ? { ...b, isResponsable: !b.isResponsable } : b
      )
    );
  }, []);

  const handleConfirmUpload = useCallback(async () => {
    setIsUploading(true);
    try {
      const result = await executeBulkUpload(brothers, communityId, setUploadProgress);
      setUploadResult(result);
      if (result.success) {
        onComplete();
      }
    } catch (error: unknown) {
      setUploadResult({
        success: false,
        peopleCreated: 0,
        brothersLinked: 0,
        marriagesLinked: 0,
        responsablesAssigned: 0,
        errors: [error instanceof Error ? error.message : 'Error inesperado'],
      });
    } finally {
      setIsUploading(false);
    }
  }, [brothers, communityId, onComplete]);

  const validation = useMemo(
    () => validateBrothersForUpload(brothers),
    [brothers]
  );

  const groupedForResponsables = useMemo(() => {
    const validBrothers = brothers.filter((b) => b.status !== 'error');
    const groups: Record<string, ParsedBrother[]> = {};
    for (const b of validBrothers) {
      const key = b.carisma || 'Sin carisma';
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    }
    return Object.entries(groups)
      .map(([carisma, bros]) => ({ carisma, brothers: bros }))
      .sort((a, b) => {
        const orderA = CARISMA_GROUP_ORDER[a.carisma] ?? 99;
        const orderB = CARISMA_GROUP_ORDER[b.carisma] ?? 99;
        return orderA - orderB;
      });
  }, [brothers]);

  const stepIndex = STEPS.indexOf(currentStep);

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 'upload':
        return brothers.length > 0 && globalErrors.length === 0;
      case 'review':
        return !validation.hasErrors && brothers.filter((b) => b.status !== 'error').length > 0;
      case 'responsables':
        return true;
      case 'confirm':
        return !isUploading;
      default:
        return false;
    }
  }, [currentStep, brothers, globalErrors, validation, isUploading]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Carga Masiva - Comunidad {communityNumber}
          </DialogTitle>
          <DialogDescription>
            Carga hermanos desde un archivo CSV
          </DialogDescription>
        </DialogHeader>

        <Stepper
          steps={STEPPER_ITEMS}
          currentStep={stepIndex}
          ariaLabel="Progreso de carga masiva"
          className="mb-4 px-2"
        />

        {/* Step Content */}
        <div
          className="flex-1 overflow-y-auto min-h-0"
          aria-live="polite"
          aria-label={`Paso ${stepIndex + 1} de ${STEPS.length}: ${STEP_LABELS[currentStep]}`}
        >
          {/* Step 1: Upload */}
          {currentStep === 'upload' && (
            <StepUpload
              fileName={fileName}
              isParsing={isParsing}
              globalErrors={globalErrors}
              brothersCount={brothers.length}
              onFileDrop={handleFileDrop}
              onFileInput={handleFileInput}
              fileInputRef={fileInputRef}
            />
          )}

          {/* Step 2: Review */}
          {currentStep === 'review' && (
            <StepReview
              brothers={brothers}
              validation={validation}
              onDeleteRow={handleDeleteRow}
            />
          )}

          {/* Step 3: Responsables */}
          {currentStep === 'responsables' && (
            <StepResponsables
              groups={groupedForResponsables}
              onToggle={handleToggleResponsable}
            />
          )}

          {/* Step 4: Confirm */}
          {currentStep === 'confirm' && (
            <StepConfirm
              brothers={brothers}
              validation={validation}
              uploadProgress={uploadProgress}
              uploadResult={uploadResult}
              isUploading={isUploading}
              communityNumber={communityNumber}
            />
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 sm:gap-0">
          {uploadResult ? (
            <Button onClick={handleClose}>Cerrar</Button>
          ) : (
            <>
              {stepIndex > 0 && !isUploading && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(STEPS[stepIndex - 1])}
                >
                  Anterior
                </Button>
              )}
              {currentStep === 'confirm' ? (
                <Button
                  onClick={handleConfirmUpload}
                  disabled={isUploading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    'Confirmar Carga'
                  )}
                </Button>
              ) : (
                <>
                  {currentStep === 'upload' && !canGoNext && (
                    <p className="mr-auto self-center text-sm text-muted-foreground">
                      Sube un archivo para continuar
                    </p>
                  )}
                  <Button
                    onClick={() => setCurrentStep(STEPS[stepIndex + 1])}
                    disabled={!canGoNext}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Siguiente
                  </Button>
                </>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Step Components ---

const TEMPLATE_COLUMNS: { name: string; required?: boolean }[] = [
  { name: 'nombre', required: true },
  { name: 'telefono' },
  { name: 'celular' },
  { name: 'email' },
  { name: 'carisma' },
  { name: 'genero' },
  { name: 'es_itinerante' },
  { name: 'nombre_conyuge' },
];

function InstructionStep({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
      >
        {number}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium leading-6">{title}</p>
        {children}
      </div>
    </li>
  );
}

function StepUpload({
  fileName,
  isParsing,
  globalErrors,
  brothersCount,
  onFileDrop,
  onFileInput,
  fileInputRef,
}: {
  fileName: string;
  isParsing: boolean;
  globalErrors: string[];
  brothersCount: number;
  onFileDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const hasErrors = globalErrors.length > 0;

  return (
    <div className="space-y-5">
      <ol className="space-y-4" aria-label="Cómo preparar el archivo">
        <InstructionStep number={1} title="Descarga la plantilla">
          <Button variant="outline" size="sm" onClick={downloadCsvTemplate} className="gap-2">
            <Download aria-hidden="true" className="size-4" />
            Descargar plantilla CSV
          </Button>
        </InstructionStep>

        <InstructionStep
          number={2}
          title="Llénala en Excel o Google Sheets, un hermano por fila"
        >
          <p className="text-sm text-muted-foreground">
            No cambies los nombres de las columnas. Solo el nombre es obligatorio; al
            terminar, guarda el archivo como <span className="font-medium text-foreground">CSV</span>.
          </p>
          <ul className="flex flex-wrap gap-1.5" aria-label="Columnas de la plantilla">
            {TEMPLATE_COLUMNS.map((col) => (
              <li key={col.name}>
                <Badge variant={col.required ? 'default' : 'muted'} className="font-mono font-normal">
                  {col.name}
                  {col.required && <span className="sr-only"> (obligatoria)</span>}
                  {col.required && <span aria-hidden="true">*</span>}
                </Badge>
              </li>
            ))}
          </ul>
        </InstructionStep>

        <InstructionStep number={3} title="Sube el archivo" />
      </ol>

      {/* Drop zone */}
      <span id="bulk-upload-csv-help" className="sr-only">
        Solo archivos CSV
      </span>
      <label
        htmlFor="bulk-upload-csv"
        data-dragging={isDragging || undefined}
        className={cn(
          'flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          'hover:border-primary hover:bg-primary/5',
          isDragging
            ? 'border-primary bg-primary/5'
            : hasErrors
              ? 'border-destructive/50 bg-destructive/5'
              : fileName
                ? 'border-primary/40 bg-muted/40'
                : 'border-border bg-muted/30'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          setIsDragging(false);
          onFileDrop(e);
        }}
      >
        <input
          id="bulk-upload-csv"
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={onFileInput}
          aria-label="Archivo CSV de hermanos"
          aria-describedby="bulk-upload-csv-help"
        />
        {isParsing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 aria-hidden="true" className="size-9 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Procesando archivo...</p>
          </div>
        ) : fileName ? (
          <div className="flex flex-col items-center gap-1.5">
            <FileText aria-hidden="true" className="size-9 text-primary" />
            <p className="font-medium">{fileName}</p>
            {!hasErrors && (
              <p className="text-sm text-muted-foreground">
                {brothersCount} {brothersCount === 1 ? 'hermano encontrado' : 'hermanos encontrados'}
              </p>
            )}
            <span className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline">
              Elegir otro archivo
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Upload aria-hidden="true" className="size-6 text-primary" />
            </span>
            <div className="space-y-1">
              <p className="font-medium">Arrastra tu archivo CSV aquí</p>
              <p className="text-sm text-muted-foreground">o</p>
            </div>
            <span className="inline-flex h-9 items-center rounded-md border bg-card px-4 text-sm font-medium shadow-xs">
              Seleccionar archivo
            </span>
            <p className="text-xs text-muted-foreground">Solo archivos .csv</p>
          </div>
        )}
      </label>

      {/* Global errors */}
      {hasErrors && (
        <FormAlert tone="error" title="No pudimos leer el archivo">
          <ul className="space-y-1">
            {globalErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </FormAlert>
      )}
    </div>
  );
}

function StepReview({
  brothers,
  validation,
  onDeleteRow,
}: {
  brothers: ParsedBrother[];
  validation: ReturnType<typeof validateBrothersForUpload>;
  onDeleteRow: (rowIndex: number) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {validation.validCount} válidos
        </Badge>
        {validation.warningCount > 0 && (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {validation.warningCount} advertencias
          </Badge>
        )}
        {validation.errorCount > 0 && (
          <Badge variant="danger" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {validation.errorCount} errores
          </Badge>
        )}
        {validation.marriageCount > 0 && (
          <Badge variant="info" className="gap-1">
            {validation.marriageCount} matrimonios
          </Badge>
        )}
      </div>

      {validation.hasErrors && (
        <FormAlert tone="error">
          Corrige las filas marcadas en tu archivo y vuelve a subirlo, o elimínalas con el
          ícono de papelera para continuar.
        </FormAlert>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-auto max-h-[45vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Carisma</TableHead>
              <TableHead>Género</TableHead>
              <TableHead>Celular</TableHead>
              <TableHead>Cónyuge</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brothers.map((brother) => (
              <TableRow
                key={brother.rowIndex}
                className={
                  brother.status === 'error'
                    ? 'bg-destructive/5'
                    : brother.status === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/30'
                    : ''
                }
              >
                <TableCell className="text-xs text-muted-foreground/70">
                  {brother.rowIndex + 1}
                </TableCell>
                <TableCell>
                  {brother.status === 'valid' && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  {brother.status === 'warning' && (
                    <div title={brother.warnings.join('\n')}>
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    </div>
                  )}
                  {brother.status === 'error' && (
                    <div title={brother.errors.join('\n')}>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <div>
                    {brother.nombre || <span className="text-red-400 italic">Sin nombre</span>}
                    {brother.esItinerante && (
                      <CarismaBadge carisma="Itinerante" size="sm" className="ml-1" />
                    )}
                  </div>
                  {brother.errors.length > 0 && (
                    <div className="text-xs text-red-600 mt-0.5">
                      {brother.errors.join('. ')}
                    </div>
                  )}
                  {brother.warnings.length > 0 && (
                    <div className="text-xs text-yellow-600 mt-0.5">
                      {brother.warnings.join('. ')}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {brother.carisma ? (
                    <CarismaBadge carisma={brother.carisma} size="sm" />
                  ) : (
                    <span className="text-muted-foreground/70 text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{brother.genero || '-'}</TableCell>
                <TableCell className="text-sm">{brother.celular || '-'}</TableCell>
                <TableCell className="text-sm">{brother.nombreConyuge || '-'}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteRow(brother.rowIndex)}
                    aria-label={`Quitar fila ${brother.rowIndex + 1}${brother.nombre ? ` (${brother.nombre})` : ''}`}
                    className="h-7 w-7 p-0 text-muted-foreground/70 hover:text-destructive"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StepResponsables({
  groups,
  onToggle,
}: {
  groups: { carisma: string; brothers: ParsedBrother[] }[];
  onToggle: (rowIndex: number) => void;
}) {
  const selectedCount = groups
    .flatMap((g) => g.brothers)
    .filter((b) => b.isResponsable).length;

  return (
    <div className="space-y-4">
      <FormAlert tone="info" title="Paso opcional">
        Marca los hermanos que serán parte del equipo de responsables de la comunidad.
        Puedes omitirlo y asignarlos después.
      </FormAlert>

      {selectedCount > 0 && (
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {selectedCount} responsable{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
        </Badge>
      )}

      <div className="border rounded-lg overflow-auto max-h-[45vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Resp.</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Carisma</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <Fragment key={`group-${group.carisma}`}>
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={3} className="py-2">
                    <div className="flex items-center gap-1.5">
                      <CarismaBadge carisma={group.carisma} size="md" />
                      <span className="text-xs text-muted-foreground">
                        ({group.brothers.length})
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
                {group.brothers.map((brother) => (
                  <TableRow key={brother.rowIndex}>
                    <TableCell>
                      <Checkbox
                        checked={brother.isResponsable}
                        onCheckedChange={() => onToggle(brother.rowIndex)}
                      />
                    </TableCell>
                    <TableCell className="font-medium pl-6">
                      {brother.nombre}
                    </TableCell>
                    <TableCell>
                      {brother.carisma ? (
                        <CarismaBadge carisma={brother.carisma} size="sm" />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StepConfirm({
  brothers,
  validation,
  uploadProgress,
  uploadResult,
  isUploading,
  communityNumber,
}: {
  brothers: ParsedBrother[];
  validation: ReturnType<typeof validateBrothersForUpload>;
  uploadProgress: UploadProgress | null;
  uploadResult: UploadResult | null;
  isUploading: boolean;
  communityNumber: string;
}) {
  const responsablesCount = brothers.filter((b) => b.isResponsable).length;

  if (uploadResult) {
    return (
      <div className="space-y-4">
        <div
          className={`p-6 rounded-lg border text-center space-y-3 ${
            uploadResult.success
              ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
              : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
          }`}
        >
          {uploadResult.success ? (
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
          ) : (
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-600" />
          )}
          <h3 className="text-lg font-semibold">
            {uploadResult.success
              ? 'Carga completada exitosamente'
              : 'Carga completada con algunos errores'}
          </h3>
          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-sm">
            <div className="text-right text-muted-foreground">Personas creadas:</div>
            <div className="text-left font-medium">{uploadResult.peopleCreated}</div>
            <div className="text-right text-muted-foreground">Hermanos vinculados:</div>
            <div className="text-left font-medium">{uploadResult.brothersLinked}</div>
            <div className="text-right text-muted-foreground">Matrimonios:</div>
            <div className="text-left font-medium">{uploadResult.marriagesLinked}</div>
            <div className="text-right text-muted-foreground">Responsables:</div>
            <div className="text-left font-medium">{uploadResult.responsablesAssigned}</div>
          </div>
        </div>

        {uploadResult.errors.length > 0 && (
          <FormAlert tone="error" title="Errores durante la carga">
            <ul className="space-y-1">
              {uploadResult.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </FormAlert>
        )}
      </div>
    );
  }

  if (isUploading && uploadProgress) {
    return (
      <div className="p-8 text-center space-y-4">
        <Loader2 aria-hidden="true" className="mx-auto size-12 animate-spin text-primary" />
        <p id="bulk-upload-phase" className="font-medium text-lg">{uploadProgress.phaseLabel}</p>
        <Progress
          value={uploadProgress.current}
          max={Math.max(uploadProgress.total, 1)}
          aria-labelledby="bulk-upload-phase"
          getValueLabel={(value, max) => `${value} de ${max} registros`}
          className="mx-auto max-w-md"
        />
        <p className="text-sm text-muted-foreground" aria-hidden="true">
          {uploadProgress.current} / {uploadProgress.total}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-6 bg-muted/50 rounded-lg border space-y-4">
        <h3 className="font-semibold text-lg">Resumen de la carga</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between p-3 bg-card rounded border">
            <span className="text-muted-foreground">Hermanos a crear:</span>
            <span className="font-semibold">
              {brothers.filter((b) => b.status !== 'error').length}
            </span>
          </div>
          <div className="flex justify-between p-3 bg-card rounded border">
            <span className="text-muted-foreground">Matrimonios:</span>
            <span className="font-semibold">{validation.marriageCount}</span>
          </div>
          <div className="flex justify-between p-3 bg-card rounded border">
            <span className="text-muted-foreground">Responsables:</span>
            <span className="font-semibold">{responsablesCount}</span>
          </div>
          {validation.warningCount > 0 && (
            <div className="flex justify-between rounded border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <span className="text-amber-700 dark:text-amber-300">Advertencias:</span>
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                {validation.warningCount}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="font-medium">Al confirmar se realizarán las siguientes acciones:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Crear los registros de personas en la base de datos</li>
          <li>Vincular los hermanos a la comunidad {communityNumber}</li>
          {validation.marriageCount > 0 && (
            <li>Vincular {validation.marriageCount} matrimonio(s)</li>
          )}
          {responsablesCount > 0 && (
            <li>Asignar {responsablesCount} responsable(s) al equipo</li>
          )}
        </ul>
      </div>
    </div>
  );
}
