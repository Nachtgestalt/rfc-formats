import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { addMinutes, format, parse } from 'date-fns';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { finalize, take } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ExcelService {

  constructor(private http: HttpClient) {}
  generateExcel(data: any, fileName: string): void {

    let endTimeFirstActivity = this.addMinutesToTime(data.startTime, 20);

    console.log(endTimeFirstActivity)

    // Cargar el archivo base desde la carpeta de activos (assets)
    const arrayBuffer = this.http.get('../assets/rfc.xlsx', { responseType: 'arraybuffer' }).pipe(
      take(1),
      finalize(() => console.log('Carga de archivo base completada')) // Esto es opcional, puedes omitirlo
    ).subscribe({
      async next(arrayBuffer: ArrayBuffer) {

          // Crear un libro de Excel a partir del array de bytes
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(arrayBuffer);
          if(workbook) {
            workbook.xlsx.load(arrayBuffer).then(() => {
              // Llenar el archivo base con los datos del formulario
              const worksheet = workbook.getWorksheet(1);
              const worksheet2 = workbook.getWorksheet('Hora x Hora');

              // Definir el índice de la fila donde comenzaremos a agregar datos
              let rowIndex = 9; // Suponiendo que la primera fila contiene encabezados y queremos comenzar desde la segunda fila

              console.log(data)
              if(worksheet && worksheet2) {
                worksheet.getCell('C2').value = data.comitteDay;
                worksheet.getCell('D5').value = data.changePromoter;
                worksheet.getCell('K5').value = data.changePromoterEmail;
                worksheet.getCell('C7').value = data.service;
                worksheet.getCell('C9').value = data.serviceOwner;
                worksheet.getCell('C11').value = data.shortDescription;
                worksheet.getCell('C13').value = data.description;
                worksheet.getCell('C23').value = `${data.startDate} ${data.startTime}`;
                worksheet.getCell('G23').value = `${data.endDate} ${data.endTime}`;

                worksheet2.getCell('D1').value = data.startTime;
                worksheet2.getCell('F9').value = endTimeFirstActivity
              }

              // Guardar el archivo resultante
              workbook.xlsx.writeBuffer().then((buffer) => {
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${data.shortDescription}.xlsx`;
                a.click();
                window.URL.revokeObjectURL(url);
              });
            });

          }

      },
      error() {

      }
    })
  }

  addMinutesToTime(time: string, minutesToAdd: number): string {
    const timeFormat = 'hh:mm a'; // Formato de 12 horas con AM/PM
    const parsedTime = parse(time, timeFormat, new Date()); // Parsear la cadena de tiempo en un objeto Date
    const newTime = addMinutes(parsedTime, minutesToAdd); // Sumar los minutos
    return format(newTime, timeFormat); // Formatear el resultado de nuevo en el formato deseado
  }
}
