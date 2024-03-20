import { Component, QueryList, ViewChildren } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { RouterOutlet } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { ExcelService } from './excel.service';
import { MatButtonModule } from '@angular/material/button';

import { NgxMatTimepickerComponent, NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { addMinutes, closestTo, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, differenceInWeeks, formatDuration, parse, set } from 'date-fns';
import { MatIconModule } from '@angular/material/icon';
import {es} from 'date-fns/locale';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    NgxMatTimepickerModule,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'rfc_creation';

  minDate: Date;
  maxDate: Date;

  @ViewChildren('datepickers') datepickers!: QueryList<MatDatepicker<any>>;
  @ViewChildren('timepickers') timepickers!: QueryList<NgxMatTimepickerComponent>;

  form: FormGroup

  constructor(private excelService: ExcelService, private datePipe: DatePipe) {
    const formattedStartDate = this.datePipe.transform(new Date(this.getNextMonday()), 'dd/MMM/yyyy');

    this.form = new FormGroup({
      "comitteDay": new FormControl(new Date(this.getNextMonday()), Validators.required),
      "changePromoter": new FormControl("Luis Angel Osorio", Validators.required),
      "changePromoterEmail": new FormControl("luis.osorio@outlook.com", Validators.required),
      "service": new FormControl("WAF - Imperva On Premise", Validators.required),
      "serviceOwner": new FormControl("Pedro", Validators.required),
      "shortDescription": new FormControl("Configurar Imperva TRP", Validators.required),
      "description": new FormControl("Esto es la descripcion", Validators.required),
      "startDate": new FormControl(formattedStartDate, Validators.required),
      "startTime": new FormControl("", Validators.required),
      "endDate": new FormControl(formattedStartDate, Validators.required),
      "endTime": new FormControl("", Validators.required),
      'activities': new FormArray([])
    });

    const currentYear = new Date().getFullYear();
    this.minDate = new Date(currentYear - 20, 0, 1);
    this.maxDate = new Date(currentYear + 1, 11, 31);
  }

  exportToExcel(): void {
    let form = this.form.value
    form.startDate = this.datePipe.transform(form.startDate, 'dd/MMM/yyyy');
    form.endDate = this.datePipe.transform(form.endDate, 'dd/MMM/yyyy');

    this.excelService.generateExcel(form, 'user_data');
  }

  getNextMonday(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 es domingo, 1 es lunes, etc.
    const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilNextMonday);
    return nextMonday;
  }

  onSubmitModelBased() {
    console.log(this.form.value)
    this.exportToExcel()
  }

  createActivity(startDate?: any, startTime?: any): FormGroup {

    // Validación personalizada para la fecha de inicio
    const startDateValidator = (control: FormControl): { [key: string]: any } | null => {
      if (control.value < this.form.get('startDate')?.value) {
        return { 'invalidStartDate': true };
      }
      return null;
    };

    // Validación personalizada para la fecha de fin
    const endDateValidator = (control: FormControl): { [key: string]: any } | null => {
      if (control.value > this.form.get('endDate')?.value) {
        return { 'invalidEndDate': true };
      }
      return null;
    };

    const dateWithTime = this.combineDateAndTime(startDate, startTime);
    return new FormGroup({
      'index': new FormControl(''),
      'name': new FormControl(''),
      'startDate': new FormControl(startDate ? dateWithTime : '', [Validators.required, startDateValidator]),
      'startTime': new FormControl(startTime ? startTime : ''),
      'endDate': new FormControl(startDate ? dateWithTime : '', [Validators.required, endDateValidator]),
      'endTime': new FormControl(''),
      'duration': new FormControl(''),
      'area': new FormControl(''),
      'responsible': new FormControl(''),
      'comments': new FormControl('')
    })
  }

  addActivity() {
    const control = <FormArray<FormGroup>>this.form.get('activities');
    if (control.length === 0) {
      control.push(this.createActivity(this.form.get('startDate')?.value, this.form.get('startTime')?.value));
    } else {

      let previousActivityEndTime = control.at(control.length - 1).get('endTime')?.value;
      let previousActivityEndDate = this.combineDateAndTime(control.at(control.length - 1).get('endDate')?.value, previousActivityEndTime);

      control.push(this.createActivity(previousActivityEndDate, previousActivityEndTime))

      console.log('Agregando activity')
      console.log(control.at(control.length - 1).value)
    }

    this.updateEndTime(control.at(control.length - 1)); // Llamada a updateEndTime

  }

  deleteActivity(index: number) {
    const control = <FormArray>this.form.controls['activities'];
    control.removeAt(index);
  }

  get activities() {
    return this.form.get('activities') as FormArray;
  }

  updateEndTime(activityForm: FormGroup) {
    activityForm.get('startDate')?.valueChanges.subscribe((value: any) => {
      let endDate = activityForm.get('endDate')?.value;
      let startTime = activityForm.get('startTime')?.value
      activityForm.get('duration')?.setValue(this.calculateDuration(this.combineDateAndTime(value, startTime), endDate));
    });

    activityForm.get('endDate')?.valueChanges.subscribe((value: any) => {
      let startDate = activityForm.get('startDate')?.value;
      let endTime = activityForm.get('endTime')?.value
      activityForm.get('duration')?.setValue(this.calculateDuration(startDate,this.combineDateAndTime(value, endTime)));
    });

    activityForm.get('startTime')?.valueChanges.subscribe((value: any) => {
      console.log(value)
      let date = activityForm.get('startDate')?.value;
      let endDate = activityForm.get('endDate')?.value;
      activityForm.get('startDate')?.setValue(this.combineDateAndTime(date, value))
      date = activityForm.get('endDate')?.value;
      activityForm.get('duration')?.setValue(this.calculateDuration(date, endDate));
    });

    activityForm.get('endTime')?.valueChanges.subscribe((value: any) => {
      console.log(value)
      let date = activityForm.get('startDate')?.value;
      let endDate = activityForm.get('endDate')?.value;
      activityForm.get('endDate')?.setValue(this.combineDateAndTime(endDate, value))
      endDate = activityForm.get('endDate')?.value;
      activityForm.get('duration')?.setValue(this.calculateDuration(date, endDate));
    });
  }

  combineDateAndTime(date: Date, time: string): Date {
    console.log(date, time)
    // Parsea la cadena de tiempo en un objeto de fecha de date-fns
    const parsedTime = parse(time, 'h:mm a', new Date());

    console.log(date, parsedTime)

    // Establece la hora y los minutos de la fecha utilizando los valores de la cadena de tiempo
    const combinedDateTime = set(date, {
      hours: parsedTime.getHours(),
      minutes: parsedTime.getMinutes()
    });

    console.log(combinedDateTime)

    return combinedDateTime;
  }

  calculateDuration(startDate: Date, endDate: Date): string {
      // Calcular la diferencia total en segundos entre las fechas
  const durationInSeconds = differenceInSeconds(endDate, startDate);

  // Definir los límites para cada unidad de tiempo en segundos
  const minuteInSeconds = 60;
  const hourInSeconds = 60 * minuteInSeconds;
  const dayInSeconds = 24 * hourInSeconds;
  const weekInSeconds = 7 * dayInSeconds;

  // Determinar la combinación óptima de unidades de tiempo
  let remainingDuration = durationInSeconds;
  const weeks = Math.floor(remainingDuration / weekInSeconds);
  remainingDuration %= weekInSeconds;
  const days = Math.floor(remainingDuration / dayInSeconds);
  remainingDuration %= dayInSeconds;
  const hours = Math.floor(remainingDuration / hourInSeconds);
  remainingDuration %= hourInSeconds;
  const minutes = Math.floor(remainingDuration / minuteInSeconds);

  // Construir el string de la duración
  let formattedDuration = '';
  if (weeks > 0) {
    formattedDuration += `${weeks} semana${weeks !== 1 ? 's' : ''} `;
  }
  if (days > 0) {
    formattedDuration += `${days} día${days !== 1 ? 's' : ''} `;
  }
  if (hours > 0) {
    formattedDuration += `${hours} hora${hours !== 1 ? 's' : ''} `;
  }
  if (minutes > 0) {
    formattedDuration += `${minutes} minuto${minutes !== 1 ? 's' : ''} `;
  }

  return formattedDuration.trim();
  }

}
