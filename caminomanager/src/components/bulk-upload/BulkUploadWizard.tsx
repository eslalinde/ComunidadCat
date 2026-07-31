'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
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
      if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
        handleFileSelect(file);
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
                <Button
                  onClick={() => setCurrentStep(STEPS[stepIndex + 1])}
                  disabled={!canGoNext}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Siguiente
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Step Components ---

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
  return (
    <div className="space-y-4">
      {/* Template download */}
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div>
          <p className="font-medium text-blue-900">Plantilla CSV</p>
          <p className="text-sm text-blue-700">
            Descarga la plantilla con el formato correcto para cargar hermanos
          </p>
        </div>
        <Button variant="outline" onClick={downloadCsvTemplate} className="gap-2">
          <Download className="h-4 w-4" />
          Descargar
        </Button>
      </div>

      {/* Drop zone */}
      <span id="bulk-upload-csv-help" className="sr-only">
        Solo archivos CSV
      </span>
      <label
        htmlFor="bulk-upload-csv"
        className="cursor-pointer rounded-lg border-2 border-dashed border-border p-12 text-center transition-colors hover:border-primary"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onFileDrop}
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
          <div className="space-y-2">
            <Loader2 className="mx-auto size-10 animate-spin text-primary" />
            <p className="text-gray-600">Procesando archivo...</p>
          </div>
        ) : fileName ? (
          <div className="space-y-2">
            <FileText className="mx-auto size-10 text-primary" />
            <p className="font-medium">{fileName}</p>
            <p className="text-sm text-gray-500">{brothersCount} registros encontrados</p>
            <p className="text-xs text-gray-400">Haz clic para cambiar el archivo</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-10 w-10 mx-auto text-gray-400" />
            <p className="text-gray-600 font-medium">
              Arrastra tu archivo CSV aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-gray-400">
              Solo archivos .csv
            </p>
          </div>
        )}
      </label>

      {/* Global errors */}
      {globalErrors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-1">
          {globalErrors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </div>
          ))}
        </div>
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
        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3" />
          {validation.validCount} válidos
        </Badge>
        {validation.warningCount > 0 && (
          <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-3 w-3" />
            {validation.warningCount} advertencias
          </Badge>
        )}
        {validation.errorCount > 0 && (
          <Badge variant="secondary" className="gap-1 bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3" />
            {validation.errorCount} errores
          </Badge>
        )}
        {validation.marriageCount > 0 && (
          <Badge variant="secondary" className="gap-1 bg-pink-100 text-pink-800">
            {validation.marriageCount} matrimonios
          </Badge>
        )}
      </div>

      {validation.hasErrors && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Corrige o elimina las filas con errores para poder continuar.
        </div>
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
                    ? 'bg-red-50'
                    : brother.status === 'warning'
                    ? 'bg-yellow-50'
                    : ''
                }
              >
                <TableCell className="text-xs text-gray-400">
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
                    <span className="text-gray-400 text-sm">-</span>
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
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          Selecciona los hermanos que serán parte del equipo de responsables de la comunidad.
          Este paso es opcional.
        </p>
      </div>

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
              <>
                <TableRow
                  key={`group-${group.carisma}`}
                  className="bg-gray-50"
                >
                  <TableCell colSpan={3} className="py-2">
                    <div className="flex items-center gap-1.5">
                      <CarismaBadge carisma={group.carisma} size="md" />
                      <span className="text-xs text-gray-500">
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
              </>
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
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
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
            <div className="text-right text-gray-600">Personas creadas:</div>
            <div className="text-left font-medium">{uploadResult.peopleCreated}</div>
            <div className="text-right text-gray-600">Hermanos vinculados:</div>
            <div className="text-left font-medium">{uploadResult.brothersLinked}</div>
            <div className="text-right text-gray-600">Matrimonios:</div>
            <div className="text-left font-medium">{uploadResult.marriagesLinked}</div>
            <div className="text-right text-gray-600">Responsables:</div>
            <div className="text-left font-medium">{uploadResult.responsablesAssigned}</div>
          </div>
        </div>

        {uploadResult.errors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-1">
            <p className="font-medium text-red-800 mb-2">Errores durante la carga:</p>
            {uploadResult.errors.map((err, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isUploading && uploadProgress) {
    const progressPercent =
      uploadProgress.total > 0
        ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
        : 0;

    return (
      <div className="p-8 text-center space-y-4">
        <Loader2 className="mx-auto size-12 animate-spin text-primary" />
        <p className="font-medium text-lg">{uploadProgress.phaseLabel}</p>
        <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-sm text-gray-500">
          {uploadProgress.current} / {uploadProgress.total}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-6 bg-gray-50 rounded-lg border space-y-4">
        <h3 className="font-semibold text-lg">Resumen de la carga</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between p-3 bg-white rounded border">
            <span className="text-gray-600">Hermanos a crear:</span>
            <span className="font-semibold">
              {brothers.filter((b) => b.status !== 'error').length}
            </span>
          </div>
          <div className="flex justify-between p-3 bg-white rounded border">
            <span className="text-gray-600">Matrimonios:</span>
            <span className="font-semibold">{validation.marriageCount}</span>
          </div>
          <div className="flex justify-between p-3 bg-white rounded border">
            <span className="text-gray-600">Responsables:</span>
            <span className="font-semibold">{responsablesCount}</span>
          </div>
          {validation.warningCount > 0 && (
            <div className="flex justify-between p-3 bg-yellow-50 rounded border border-yellow-200">
              <span className="text-yellow-700">Advertencias:</span>
              <span className="font-semibold text-yellow-700">
                {validation.warningCount}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
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
