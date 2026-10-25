package com.optima.api.modules.appointment.service;

import com.optima.api.modules.appointment.repository.AppointmentRepository;
import com.optima.api.modules.business.model.BusinessHour;
import com.optima.api.modules.business.repository.BusinessHourRepository;
import com.optima.api.modules.business.repository.ScheduleBlockRepository;
import com.optima.api.modules.user.model.EmployeeSchedule;
import com.optima.api.modules.user.repository.EmployeeAbsenceRepository;
import com.optima.api.modules.user.repository.EmployeeScheduleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AppointmentValidatorTest {

    // lunes 7 de enero de 2030
    private static final LocalDateTime LUNES_10 = LocalDateTime.of(2030, 1, 7, 10, 0);

    private EmployeeScheduleRepository scheduleRepository;
    private BusinessHourRepository businessHourRepository;
    private AppointmentValidator validator;

    @BeforeEach
    void setUp() {
        scheduleRepository = mock(EmployeeScheduleRepository.class);
        businessHourRepository = mock(BusinessHourRepository.class);
        validator = new AppointmentValidator(
                mock(AppointmentRepository.class),
                scheduleRepository,
                mock(EmployeeAbsenceRepository.class),
                mock(ScheduleBlockRepository.class),
                businessHourRepository);
    }

    // transiciones de estado

    @ParameterizedTest
    @CsvSource({
            "PENDING, CONFIRMED", "PENDING, CANCELLED",
            "CONFIRMED, IN_PROGRESS", "CONFIRMED, CANCELLED", "CONFIRMED, NO_SHOW",
            "IN_PROGRESS, COMPLETED", "IN_PROGRESS, CANCELLED"
    })
    void transicionesPermitidas(String actual, String nuevo) {
        assertThatCode(() -> validator.validateStatusTransition(actual, nuevo))
                .doesNotThrowAnyException();
    }

    @ParameterizedTest
    @CsvSource({
            "PENDING, COMPLETED", "PENDING, IN_PROGRESS", "CONFIRMED, PENDING",
            "COMPLETED, PENDING", "CANCELLED, CONFIRMED", "NO_SHOW, CONFIRMED"
    })
    void transicionesNoPermitidas(String actual, String nuevo) {
        assertThatThrownBy(() -> validator.validateStatusTransition(actual, nuevo))
                .isInstanceOf(ResponseStatusException.class);
    }

    // intervalo

    @Test
    void intervaloRechazaSegundos() {
        assertThatThrownBy(() -> validator.validateAppointmentInterval(LUNES_10.withSecond(30), 30))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void intervaloDe30AceptaEnPuntoYMedia() {
        assertThatCode(() -> validator.validateAppointmentInterval(LUNES_10, 30)).doesNotThrowAnyException();
        assertThatCode(() -> validator.validateAppointmentInterval(LUNES_10.withMinute(30), 30)).doesNotThrowAnyException();
        assertThatThrownBy(() -> validator.validateAppointmentInterval(LUNES_10.withMinute(15), 30))
                .isInstanceOf(ResponseStatusException.class);
    }

    // horario del empleado

    @Test
    void citaDentroDelHorarioDelEmpleado() {
        when(scheduleRepository.findAllByMembershipIdAndDayOfWeek(anyLong(), anyInt()))
                .thenReturn(List.of(tramo(9, 14)));
        assertThatCode(() -> validator.validateEmployeeSchedule(1L, LUNES_10, LUNES_10.plusHours(1)))
                .doesNotThrowAnyException();
    }

    @Test
    void citaQueSeSaleDelHorarioDelEmpleado() {
        when(scheduleRepository.findAllByMembershipIdAndDayOfWeek(anyLong(), anyInt()))
                .thenReturn(List.of(tramo(9, 10)));
        assertThatThrownBy(() -> validator.validateEmployeeSchedule(1L, LUNES_10, LUNES_10.plusHours(1)))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void empleadoQueNoTrabajaEseDia() {
        when(scheduleRepository.findAllByMembershipIdAndDayOfWeek(anyLong(), anyInt()))
                .thenReturn(List.of());
        assertThatThrownBy(() -> validator.validateEmployeeSchedule(1L, LUNES_10, LUNES_10.plusHours(1)))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void citaQueCruzaMedianoche() {
        LocalDateTime noche = LUNES_10.withHour(23);
        assertThatThrownBy(() -> validator.validateEmployeeSchedule(1L, noche, noche.plusHours(2)))
                .isInstanceOf(ResponseStatusException.class);
    }

    // horario del negocio

    @Test
    void turnoPartidoAceptaCitaEnElSegundoTramo() {
        when(businessHourRepository.findAllByBusinessIdAndDayOfWeekOrderByStartTimeAsc(anyLong(), anyInt()))
                .thenReturn(List.of(apertura(10, 14), apertura(16, 20)));
        LocalDateTime tarde = LUNES_10.withHour(17);
        assertThatCode(() -> validator.validateBusinessHours(1L, tarde, tarde.plusHours(1)))
                .doesNotThrowAnyException();
    }

    @Test
    void turnoPartidoRechazaCitaEnLaPausa() {
        when(businessHourRepository.findAllByBusinessIdAndDayOfWeekOrderByStartTimeAsc(anyLong(), anyInt()))
                .thenReturn(List.of(apertura(10, 14), apertura(16, 20)));
        LocalDateTime pausa = LUNES_10.withHour(14);
        assertThatThrownBy(() -> validator.validateBusinessHours(1L, pausa, pausa.plusHours(1)))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void diaCerrado() {
        BusinessHour cerrado = apertura(10, 14);
        cerrado.setIsClosed(true);
        when(businessHourRepository.findAllByBusinessIdAndDayOfWeekOrderByStartTimeAsc(anyLong(), anyInt()))
                .thenReturn(List.of(cerrado));
        assertThatThrownBy(() -> validator.validateBusinessHours(1L, LUNES_10, LUNES_10.plusHours(1)))
                .isInstanceOf(ResponseStatusException.class);
    }

    private static EmployeeSchedule tramo(int desde, int hasta) {
        EmployeeSchedule s = new EmployeeSchedule();
        s.setDayOfWeek(1);
        s.setStartTime(LocalTime.of(desde, 0));
        s.setEndTime(LocalTime.of(hasta, 0));
        return s;
    }

    private static BusinessHour apertura(int desde, int hasta) {
        BusinessHour h = new BusinessHour();
        h.setDayOfWeek(1);
        h.setStartTime(LocalTime.of(desde, 0));
        h.setEndTime(LocalTime.of(hasta, 0));
        h.setIsClosed(false);
        return h;
    }
}
