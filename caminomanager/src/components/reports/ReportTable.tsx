"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { Spinner } from "@/components/ui/spinner";

interface ReportData {
  [key: string]: any;
}

interface ReportTableProps {
  title: string;
  description: string;
  columns: {
    key: string;
    label: string;
    render?: (value: any, row: ReportData) => React.ReactNode;
  }[];
  data: ReportData[];
  loading: boolean;
  onRefresh: () => void;
  exportFileName?: string;
}

export function ReportTable({
  title,
  description,
  columns,
  data,
  loading,
  onRefresh,
  exportFileName = "reporte"
}: ReportTableProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = () => {
    setIsExporting(true);
    
    // Función para escapar valores CSV correctamente
    const escapeCSVValue = (value: any): string => {
      if (value === null || value === undefined) return '';
      
      const stringValue = String(value);
      
      // Si contiene comillas, comas o saltos de línea, envolver en comillas y escapar comillas internas
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    };
    
    const headers = columns.map(col => escapeCSVValue(col.label)).join(',');
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.key];
        return escapeCSVValue(value);
      }).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Agregar BOM (Byte Order Mark) para UTF-8 para compatibilidad con Excel
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${exportFileName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIsExporting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={routes.reportes}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button 
            onClick={exportToCSV}
            disabled={loading || isExporting || data.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
            <span className="ml-3 text-muted-foreground">Cargando datos...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No hay datos disponibles</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.key}>{column.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={index}>
                    {columns.map((column) => (
                      <TableCell key={column.key}>
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key] || '-'
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {data.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Mostrando {data.length} registros
          </div>
        )}
      </Card>
    </div>
  );
}
