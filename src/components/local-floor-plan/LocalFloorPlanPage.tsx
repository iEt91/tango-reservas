"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { getBusinesses, subscribeBusinesses } from "@/data/businesses";
import type {
  Business,
  FloorPlanBackground,
  FloorTable,
  Reservation,
  TableOccupancySummary,
} from "@/data/types";
import { getBusinessHours, getReservationRules } from "@/data/scheduling";
import {
  createFloorTable,
  deleteFloorTable,
  getDefaultFloorPlanForBusiness,
  getFloorTablesByBusinessId,
  resetFloorPlan,
  subscribeFloorPlan,
  updateFloorTable,
  updateFloorTablePosition,
} from "@/data/floor-plan";
import {
  defaultFloorPlanBackground,
  getFloorPlanBackgroundByBusinessId,
  resetFloorPlanBackground,
  subscribeFloorPlanBackground,
  updateFloorPlanBackground,
} from "@/data/floor-plan-background";
import {
  getReservationById,
  getReservationsByBusinessId,
  getTableAvailabilitySummary,
  subscribeReservations,
} from "@/data/reservations";
import { FloorPlanStats } from "./FloorPlanStats";
import { FloorPlanToolbar } from "./FloorPlanToolbar";
import { FloorPlanCanvas } from "./FloorPlanCanvas";
import { FloorTableEditor } from "./FloorTableEditor";
import { FloorTableModal } from "./FloorTableModal";
import { FloorPlanBackgroundControls } from "./FloorPlanBackgroundControls";
import { FloorPlanAvailabilityPanel } from "./FloorPlanAvailabilityPanel";
import { FloorPlanOccupancyTimeline } from "./FloorPlanOccupancyTimeline";
import { LocalBusinessWarning } from "@/components/local/LocalBusinessWarning";
import { LocalNoActiveBusinessesState } from "@/components/local/LocalNoActiveBusinessesState";
import { ReservationTableAssignmentModal } from "@/components/local-reservations/ReservationTableAssignmentModal";
import {
  buildFloorPlanTimeline,
  getFloorPlanBusinessHours,
} from "@/lib/floor-plan-timeline";
import { getDataSource } from "@/lib/data/dataSource";
import { loadAdminBusinessesSnapshot } from "@/lib/data/admin-businesses";
import { useLocalBusinessSelection } from "@/hooks/useLocalBusinessSelection";
import type { FloorTableFormValues, FloorTableResizeHandle } from "./types";
import {
  clampTableCornerRadius,
  normalizeTableDimensions,
  TABLE_DEFAULT_CORNER_RADIUS,
} from "./table-geometry";

type DragState = {
  tableId: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
} | null;

type BackgroundInteractionState = {
  mode: "move" | "resize";
  corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "right" | "bottom";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  canvasWidth: number;
  canvasHeight: number;
} | null;

const SHOW_DEBUG = false;

type TableResizeInteractionState = {
  tableId: string;
  pointerId: number;
  handle: FloorTableResizeHandle;
  shape: FloorTable["shape"];
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
} | null;

function cloneBusinesses(records: Business[]) {
  return records.map((business) => ({ ...business }));
}

function cloneTables(records: FloorTable[]) {
  return records.map((table) => ({ ...table }));
}

function getInitialTablePosition(count: number) {
  const column = count % 3;
  const row = Math.floor(count / 3);
  return {
    x: 92 + column * 220,
    y: 96 + row * 170,
  };
}

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultSlotTime(businessId: string) {
  return getBusinessHours(businessId).find((entry) => entry.isOpen)?.openTime ?? "19:00";
}

function normalizeTableValues(values: FloorTableFormValues) {
  const width = Number(values.width);
  const height = Number(values.height);
  const dimensions = normalizeTableDimensions(values.shape, width, height);

  return {
    label: values.label.trim(),
    seats: Math.max(1, Math.round(Number(values.seats) || 1)),
    width: dimensions.width,
    height: dimensions.height,
    rotation: Number(values.rotation) || 0,
    status: values.status,
    shape: values.shape,
    cornerRadius: clampTableCornerRadius(
      values.cornerRadius === "" ? TABLE_DEFAULT_CORNER_RADIUS : Number(values.cornerRadius),
    ),
    isJoinable: values.isJoinable,
  };
}

export function LocalFloorPlanPage() {
  const isSupabaseDataSource = getDataSource() === "supabase";
  const dataSourceLabel = isSupabaseDataSource ? "Supabase" : "local/mock";
  const initialBusinessId = isSupabaseDataSource ? "" : getBusinesses()[0]?.id ?? "";
  const [businesses, setBusinesses] = useState<Business[]>(() =>
    isSupabaseDataSource ? [] : cloneBusinesses(getBusinesses()),
  );
  const [selectedBusinessId, setSelectedBusinessId] = useState(() => initialBusinessId);
  const [tables, setTables] = useState<FloorTable[]>(() =>
    initialBusinessId ? getDefaultFloorPlanForBusiness(initialBusinessId) : [],
  );
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [background, setBackground] = useState<FloorPlanBackground>(() =>
    defaultFloorPlanBackground(initialBusinessId),
  );
  const [backgroundEditMode, setBackgroundEditMode] = useState(false);
  const [isTableResizeMode, setIsTableResizeMode] = useState(false);
  const [backgroundSelected, setBackgroundSelected] = useState(false);
  const [isBackgroundControlsExpanded, setIsBackgroundControlsExpanded] = useState(() =>
    !defaultFloorPlanBackground(initialBusinessId).backgroundImage,
  );
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservationForAssignmentId, setSelectedReservationForAssignmentId] =
    useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState>(null);
  const draggingTableIdRef = useRef<string | null>(null);
  const pendingDraggedTableRef = useRef<{ tableId: string; x: number; y: number } | null>(null);
  const tableResizeInteractionRef = useRef<TableResizeInteractionState>(null);
  const backgroundInteractionRef = useRef<BackgroundInteractionState>(null);

  useEffect(() => {
    let cancelled = false;

    const syncBusinesses = async () => {
      if (isSupabaseDataSource) {
        const snapshot = await loadAdminBusinessesSnapshot();

        if (cancelled) {
          return;
        }

        setBusinesses(cloneBusinesses(snapshot.businesses));
        return;
      }

      setBusinesses(cloneBusinesses(getBusinesses()));
    };

    const syncTables = () => {
      if (draggingTableIdRef.current) {
        return;
      }

      const nextTables = getFloorTablesByBusinessId(selectedBusinessId);
      setTables(cloneTables(nextTables));
      setSelectedTableId((current) =>
        current && nextTables.some((table) => table.id === current)
          ? current
          : nextTables[0]?.id ?? null,
      );
    };
    const syncBackground = () => {
      if (!selectedBusinessId) {
        return;
      }

      setBackground(getFloorPlanBackgroundByBusinessId(selectedBusinessId));
    };
    const syncReservations = () => {
      if (!selectedBusinessId) {
        setReservations([]);
        return;
      }

      setReservations(getReservationsByBusinessId(selectedBusinessId));
    };

    const timeout = window.setTimeout(() => {
      void syncBusinesses();
      syncTables();
      syncBackground();
      syncReservations();
    }, 0);

    const unsubscribeBusinesses = isSupabaseDataSource
      ? () => {}
      : subscribeBusinesses(() => {
          void syncBusinesses();
        });
    const unsubscribeFloor = subscribeFloorPlan(syncTables);
    const unsubscribeBackground = subscribeFloorPlanBackground(syncBackground);
    const unsubscribeReservations = subscribeReservations(syncReservations);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      unsubscribeBusinesses();
      unsubscribeFloor();
      unsubscribeBackground();
      unsubscribeReservations();
    };
  }, [selectedBusinessId]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const {
    businessWarning,
    handleBusinessChange: handleBusinessSelectionChange,
    selectedBusiness: requestedSelectedBusiness,
  } = useLocalBusinessSelection({
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
  });
  const selectedBusiness = requestedSelectedBusiness;
  useEffect(() => {
    if (!selectedBusiness) {
      return;
    }

    setBusinesses((current) => {
      const existingIndex = current.findIndex(
        (business) =>
          business.id === selectedBusiness.id || business.slug === selectedBusiness.slug,
      );

      if (existingIndex >= 0) {
        return current.map((business, index) =>
          index === existingIndex ? selectedBusiness : business,
        );
      }

      return [selectedBusiness, ...current];
    });
  }, [selectedBusiness]);
  const selectedBusinessKey = selectedBusiness?.id ?? "";
  const selectedBusinessRules = useMemo(
    () => (selectedBusinessKey ? getReservationRules(selectedBusinessKey) : null),
    [selectedBusinessKey],
  );
  const selectedBusinessDayHours = useMemo(
    () =>
      selectedBusinessKey && selectedDate
        ? getFloorPlanBusinessHours(selectedBusinessKey, selectedDate)
        : null,
    [selectedBusinessKey, selectedDate],
  );
  const timeline = useMemo(
    () =>
      buildFloorPlanTimeline(
        selectedBusinessDayHours,
        selectedBusinessRules?.slotDurationMinutes ?? 30,
      ),
    [selectedBusinessDayHours, selectedBusinessRules],
  );

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [tables, selectedTableId],
  );

  const slotOccupancy = useMemo<TableOccupancySummary>(() => {
    if (!selectedBusinessKey || !selectedDate || !selectedTime) {
      return {
        occupiedTableIds: [],
        reservationsWithoutTable: [],
        assignmentsByTableId: {},
        joinedTableByTableId: {},
      };
    }

    return getTableAvailabilitySummary(
      selectedBusinessKey,
      selectedDate,
      selectedTime,
      reservations,
    );
  }, [selectedBusinessKey, selectedDate, selectedTime, reservations]);

  const reservationsLoaded = reservations.length;

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (timeline.isClosed) {
        if (selectedTime) {
          setSelectedTime("");
        }
        return;
      }

      if (timeline.slots.length === 0) {
        return;
      }

      if (!timeline.slots.some((slot) => slot.time === selectedTime)) {
        setSelectedTime(timeline.slots[0]?.time ?? "");
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [selectedDate, selectedTime, timeline]);

  const stats = useMemo(() => {
    const totalTables = tables.length;
    const totalSeats = tables.reduce((sum, table) => sum + table.seats, 0);
    const blocked = tables.filter(
      (table) => table.status === "blocked" || table.status === "out_of_service",
    ).length;
    const occupied = tables.filter(
      (table) =>
        slotOccupancy.occupiedTableIds.includes(table.id) ||
        table.status === "occupied" ||
        table.status === "reserved",
    ).length;
    const available = tables.filter(
      (table) =>
        table.status === "available" && !slotOccupancy.occupiedTableIds.includes(table.id),
    ).length;
    const unassignedReservations = slotOccupancy.reservationsWithoutTable.length;

    return {
      totalTables,
      totalSeats,
      available,
      occupied,
      blocked,
      unassignedReservations,
    };
  }, [slotOccupancy, tables]);

  const hasActiveBusiness = businesses.some((business) => business.status === "active");

  if (businesses.length > 0 && !hasActiveBusiness) {
    return <LocalNoActiveBusinessesState />;
  }

  function refreshTables(nextSelectedId?: string | null) {
    const nextTables = getFloorTablesByBusinessId(selectedBusinessId);
    setTables(cloneTables(nextTables));
    if (typeof nextSelectedId !== "undefined") {
      setSelectedTableId(nextSelectedId);
      return;
    }

    setSelectedTableId((current) =>
      current && nextTables.some((table) => table.id === current)
        ? current
        : nextTables[0]?.id ?? null,
    );
  }

  function handleBusinessChange(nextBusinessId: string) {
    const nextTables = getFloorTablesByBusinessId(nextBusinessId);
    setTables(cloneTables(nextTables));
    setSelectedTableId(nextTables[0]?.id ?? null);
    const nextBackground = getFloorPlanBackgroundByBusinessId(nextBusinessId);
    setBackground(nextBackground);
    setBackgroundSelected(Boolean(nextBackground.backgroundImage));
    setIsBackgroundControlsExpanded(!nextBackground.backgroundImage);
    setSelectedDate(toDateInputValue(new Date()));
    setSelectedTime(getDefaultSlotTime(nextBusinessId));
    setFeedback(null);
    setSelectedReservationForAssignmentId(null);
    setIsTableResizeMode(false);
    handleBusinessSelectionChange(nextBusinessId);
  }

  async function handleCreateTable(values: FloorTableFormValues) {
    if (!selectedBusinessId) {
      return;
    }

    const normalized = normalizeTableValues(values);
    const initialPosition = getInitialTablePosition(tables.length);
    try {
      const createdTable = await createFloorTable(selectedBusinessId, {
        label: normalized.label,
        seats: normalized.seats,
        x: initialPosition.x,
        y: initialPosition.y,
        width: normalized.width,
        height: normalized.height,
        rotation: normalized.rotation,
        status: normalized.status,
        shape: normalized.shape,
        cornerRadius: normalized.cornerRadius,
        isJoinable: normalized.isJoinable,
      });

      setIsCreateModalOpen(false);
      setFeedback(
        isSupabaseDataSource
          ? "Mesa creada en Supabase."
          : "Mesa creada en modo local/mock.",
      );
      refreshTables(createdTable.id);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo crear la mesa.");
    }
  }

  async function handleUpdateTable(tableId: string, values: FloorTableFormValues) {
    const normalized = normalizeTableValues(values);
    try {
      const updatedTable = await updateFloorTable(tableId, {
        label: normalized.label,
        seats: normalized.seats,
        width: normalized.width,
        height: normalized.height,
        rotation: normalized.rotation,
        status: normalized.status,
        shape: normalized.shape,
        cornerRadius: normalized.cornerRadius,
        isJoinable: normalized.isJoinable,
      });

      if (updatedTable) {
        setTables((current) =>
          current.map((table) => (table.id === updatedTable.id ? updatedTable : table)),
        );
        setSelectedTableId(updatedTable.id);
        setFeedback(
          isSupabaseDataSource
            ? "Mesa actualizada en Supabase."
            : "Mesa actualizada en modo local/mock.",
        );
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo actualizar la mesa.");
    }
  }

  async function handleDeleteTable(tableId: string) {
    const confirmed = window.confirm("Quieres eliminar esta mesa del plano local?");
    if (!confirmed) {
      return;
    }

    try {
      const deleted = await deleteFloorTable(tableId);
      if (deleted) {
        setFeedback(
          isSupabaseDataSource ? "Mesa eliminada en Supabase." : "Mesa eliminada.",
        );
        refreshTables(null);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo eliminar la mesa.");
    }
  }

  async function handleResetPlan() {
    if (!selectedBusinessId) {
      return;
    }

    const confirmed = window.confirm(
      "Esto va a resetear el plano local del negocio seleccionado. Queres continuar?",
    );
    if (!confirmed) {
      return;
    }

    try {
      await resetFloorPlan(selectedBusinessId);
      setFeedback(
        isSupabaseDataSource
          ? "Plano recargado desde Supabase."
          : "Plano reseteado a los datos mock iniciales.",
      );
      refreshTables(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo resetear el plano.");
    }
  }

  function handleBackgroundImageChange(file: File | null) {
    if (!selectedBusinessId) {
      return;
    }

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      const nextBackground = updateFloorPlanBackground(selectedBusinessId, {
        backgroundImage: result,
      });
      setBackground(nextBackground);
      setBackgroundSelected(Boolean(nextBackground.backgroundImage));
      setIsBackgroundControlsExpanded(true);
      setFeedback(
        isSupabaseDataSource
          ? "Imagen de fondo guardada en Supabase."
          : "Imagen de fondo guardada en modo local/mock.",
      );
    };
    reader.readAsDataURL(file);
  }

  function handleBackgroundSettingChange(
    field: "opacity" | "brightness" | "contrast" | "fit",
    value: number | FloorPlanBackground["fit"],
  ) {
    if (!selectedBusinessId) {
      return;
    }

    const nextBackground = updateFloorPlanBackground(selectedBusinessId, {
      ...(field === "fit"
        ? { fit: value as FloorPlanBackground["fit"] }
        : field === "opacity"
          ? { backgroundOpacity: value as number }
          : field === "brightness"
            ? { backgroundBrightness: value as number }
            : { backgroundContrast: value as number }),
    });
    setBackground(nextBackground);
  }

  function handleBackgroundDimensionChange(
    field: "backgroundX" | "backgroundY" | "backgroundWidth" | "backgroundHeight",
    value: number,
  ) {
    if (!selectedBusinessId) {
      return;
    }

    const nextBackground = updateFloorPlanBackground(selectedBusinessId, {
      [field]: Number.isFinite(value) ? value : 0,
    });
    setBackground(nextBackground);
  }

  function handleResetBackground() {
    if (!selectedBusinessId) {
      return;
    }

    const confirmed = window.confirm("Quieres quitar la imagen de fondo del plano?");
    if (!confirmed) {
      return;
    }

    const nextBackground = resetFloorPlanBackground(selectedBusinessId);
    setBackground(nextBackground);
    setBackgroundSelected(false);
    setIsBackgroundControlsExpanded(true);
    setFeedback(
      isSupabaseDataSource ? "Fondo del plano restablecido en Supabase." : "Fondo del plano restablecido.",
    );
  }

  function handleResetBackgroundTransform() {
    if (!selectedBusinessId) {
      return;
    }

    const nextBackground = updateFloorPlanBackground(selectedBusinessId, {
      backgroundX: 0,
      backgroundY: 0,
      backgroundWidth: 1000,
      backgroundHeight: 600,
    });
    setBackground(nextBackground);
    setFeedback("Posicion y tamano del fondo restablecidos.");
  }

  function handleToggleBackgroundEditMode() {
    setBackgroundEditMode((current) => {
      const nextValue = !current;
      setBackgroundSelected(nextValue && Boolean(background.backgroundImage));
      return nextValue;
    });
  }

  function handleToggleTableResizeMode() {
    setIsTableResizeMode((current) => !current);
  }

  const assignmentReservation =
    selectedReservationForAssignmentId == null
      ? null
      : getReservationById(selectedReservationForAssignmentId);

  function handleBackgroundPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!backgroundEditMode || !canvasRef.current || !background.backgroundImage) {
      return;
    }

    setBackgroundSelected(true);

    const canvasRect = canvasRef.current.getBoundingClientRect();

    backgroundInteractionRef.current = {
      mode: "move",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: background.backgroundX,
      startY: background.backgroundY,
      startWidth: background.backgroundWidth,
      startHeight: background.backgroundHeight,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", handleBackgroundPointerMove);
    window.addEventListener("pointerup", handleBackgroundPointerUp, { once: true });
  }

  function handleBackgroundResizePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!backgroundEditMode || !canvasRef.current || !background.backgroundImage) {
      return;
    }

    setBackgroundSelected(true);

    const canvasRect = canvasRef.current.getBoundingClientRect();

    backgroundInteractionRef.current = {
      mode: "resize",
      corner:
        event.currentTarget.dataset.corner === "top-left"
          ? "top-left"
          : event.currentTarget.dataset.corner === "top-right"
            ? "top-right"
            : event.currentTarget.dataset.corner === "bottom-left"
              ? "bottom-left"
              : event.currentTarget.dataset.corner === "right"
                ? "right"
                : event.currentTarget.dataset.corner === "bottom"
                  ? "bottom"
                  : "bottom-right",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: background.backgroundX,
      startY: background.backgroundY,
      startWidth: background.backgroundWidth,
      startHeight: background.backgroundHeight,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", handleBackgroundPointerMove);
    window.addEventListener("pointerup", handleBackgroundPointerUp, { once: true });
  }

  function handleBackgroundPointerMove(moveEvent: globalThis.PointerEvent) {
    const interaction = backgroundInteractionRef.current;
    if (!interaction || !selectedBusinessId || moveEvent.pointerId !== interaction.pointerId) {
      return;
    }

    const deltaX = moveEvent.clientX - interaction.startClientX;
    const deltaY = moveEvent.clientY - interaction.startClientY;

    let nextBackground: FloorPlanBackground | null = null;

    if (interaction.mode === "move") {
      const minX = Math.min(0, interaction.canvasWidth - interaction.startWidth);
      const maxX = Math.max(0, interaction.canvasWidth - 100);
      const minY = Math.min(0, interaction.canvasHeight - interaction.startHeight);
      const maxY = Math.max(0, interaction.canvasHeight - 100);

      const nextX = Math.max(minX, Math.min(interaction.startX + deltaX, maxX));
      const nextY = Math.max(minY, Math.min(interaction.startY + deltaY, maxY));

      nextBackground = updateFloorPlanBackground(selectedBusinessId, {
        backgroundX: nextX,
        backgroundY: nextY,
      });
    } else {
      const corner = interaction.corner ?? "bottom-right";
      const resizeWidth = corner === "top-left" || corner === "bottom-left";
      const resizeHeight = corner === "top-left" || corner === "top-right";

      const nextWidth =
        corner === "right"
          ? Math.max(100, interaction.startWidth + deltaX)
          : corner === "bottom"
            ? interaction.startWidth
            : Math.max(
                100,
                resizeWidth
                  ? interaction.startWidth - deltaX
                  : interaction.startWidth + deltaX,
              );
      const nextHeight =
        corner === "bottom"
          ? Math.max(100, interaction.startHeight + deltaY)
          : corner === "right"
            ? interaction.startHeight
            : Math.max(
                100,
                resizeHeight
                  ? interaction.startHeight - deltaY
                  : interaction.startHeight + deltaY,
              );
      const nextX =
        corner === "top-left" || corner === "bottom-left"
          ? interaction.startX + (interaction.startWidth - nextWidth)
          : interaction.startX;
      const nextY =
        corner === "top-left" || corner === "top-right"
          ? interaction.startY + (interaction.startHeight - nextHeight)
          : interaction.startY;

      nextBackground = updateFloorPlanBackground(selectedBusinessId, {
        backgroundX: nextX,
        backgroundY: nextY,
        backgroundWidth: nextWidth,
        backgroundHeight: nextHeight,
      });
    }

    if (nextBackground) {
      setBackground(nextBackground);
    }
  }

  function handleBackgroundPointerUp() {
    backgroundInteractionRef.current = null;
    window.removeEventListener("pointermove", handleBackgroundPointerMove);
  }

  function handleTableResizePointerDown(
    event: PointerEvent<HTMLElement>,
    table: FloorTable,
    handle: FloorTableResizeHandle,
  ) {
    if (!canvasRef.current) {
      return;
    }

    tableResizeInteractionRef.current = {
      tableId: table.id,
      pointerId: event.pointerId,
      handle,
      shape: table.shape,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: table.x,
      startY: table.y,
      startWidth: table.width,
      startHeight: table.height,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", handleTableResizePointerMove);
    window.addEventListener("pointerup", handleTableResizePointerUp, { once: true });

    function handleTableResizePointerMove(moveEvent: globalThis.PointerEvent) {
      const resizeState = tableResizeInteractionRef.current;
      const canvasElement = canvasRef.current;

      if (!resizeState || !canvasElement || moveEvent.pointerId !== resizeState.pointerId) {
        return;
      }

      const rect = canvasElement.getBoundingClientRect();
      const deltaX = moveEvent.clientX - resizeState.startClientX;
      const deltaY = moveEvent.clientY - resizeState.startClientY;
      const minWidth = 70;
      const minHeight = 50;

      let nextWidth =
        resizeState.handle === "top-left" || resizeState.handle === "bottom-left"
          ? Math.max(minWidth, resizeState.startWidth - deltaX)
          : resizeState.handle === "right"
            ? Math.max(minWidth, resizeState.startWidth + deltaX)
            : resizeState.handle === "top-right" || resizeState.handle === "bottom-right"
              ? Math.max(minWidth, resizeState.startWidth + deltaX)
              : resizeState.startWidth;

      let nextHeight =
        resizeState.handle === "top-left" || resizeState.handle === "top-right"
          ? Math.max(minHeight, resizeState.startHeight - deltaY)
          : resizeState.handle === "bottom"
            ? Math.max(minHeight, resizeState.startHeight + deltaY)
            : resizeState.handle === "bottom-left" || resizeState.handle === "bottom-right"
              ? Math.max(minHeight, resizeState.startHeight + deltaY)
              : resizeState.startHeight;

      if (resizeState.shape === "square") {
        const squareSize = Math.max(nextWidth, nextHeight);
        nextWidth = squareSize;
        nextHeight = squareSize;
      }

      const nextX =
        resizeState.handle === "top-left" || resizeState.handle === "bottom-left"
          ? resizeState.startX + (resizeState.startWidth - nextWidth)
          : resizeState.startX;
      const nextY =
        resizeState.handle === "top-left" || resizeState.handle === "top-right"
          ? resizeState.startY + (resizeState.startHeight - nextHeight)
          : resizeState.startY;

      const maxX = rect.width - nextWidth - 12;
      const maxY = rect.height - nextHeight - 12;
      const clampedX = Math.max(12, Math.min(nextX, Math.max(12, maxX)));
      const clampedY = Math.max(12, Math.min(nextY, Math.max(12, maxY)));

      setTables((current) =>
        current.map((currentTable) =>
          currentTable.id === resizeState.tableId
            ? {
                ...currentTable,
                x: clampedX,
                y: clampedY,
                width: nextWidth,
                height: nextHeight,
              }
            : currentTable,
        ),
      );

      void updateFloorTable(resizeState.tableId, {
        x: clampedX,
        y: clampedY,
        width: nextWidth,
        height: nextHeight,
      });
    }

    function handleTableResizePointerUp() {
      tableResizeInteractionRef.current = null;
      window.removeEventListener("pointermove", handleTableResizePointerMove);
    }
  }

  function handlePointerDownTable(
    event: PointerEvent<HTMLElement>,
    table: FloorTable,
  ) {
    if (!canvasRef.current) {
      return;
    }
    const tableRect = event.currentTarget.getBoundingClientRect();

    draggingTableIdRef.current = table.id;
    pendingDraggedTableRef.current = { tableId: table.id, x: table.x, y: table.y };
    dragStateRef.current = {
      tableId: table.id,
      pointerId: event.pointerId,
      offsetX: event.clientX - tableRect.left,
      offsetY: event.clientY - tableRect.top,
      width: tableRect.width,
      height: tableRect.height,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    function handlePointerMove(moveEvent: globalThis.PointerEvent) {
      const dragState = dragStateRef.current;
      const canvasElement = canvasRef.current;

      if (!dragState || !canvasElement) {
        return;
      }

      if (moveEvent.pointerId !== dragState.pointerId) {
        return;
      }

      const rect = canvasElement.getBoundingClientRect();
      const nextX = moveEvent.clientX - rect.left - dragState.offsetX;
      const nextY = moveEvent.clientY - rect.top - dragState.offsetY;

      const clampedX = Math.max(12, Math.min(nextX, rect.width - dragState.width - 12));
      const clampedY = Math.max(12, Math.min(nextY, rect.height - dragState.height - 12));

      setTables((current) =>
        current.map((currentTable) =>
          currentTable.id === dragState.tableId
            ? { ...currentTable, x: clampedX, y: clampedY }
            : currentTable,
        ),
      );
      pendingDraggedTableRef.current = {
        tableId: dragState.tableId,
        x: clampedX,
        y: clampedY,
      };
    }

    async function handlePointerUp() {
      const pendingDraggedTable = pendingDraggedTableRef.current;
      dragStateRef.current = null;
      draggingTableIdRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      if (!pendingDraggedTable) {
        return;
      }

      try {
        await updateFloorTablePosition(
          pendingDraggedTable.tableId,
          pendingDraggedTable.x,
          pendingDraggedTable.y,
        );
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo guardar la posicion de la mesa.");
      } finally {
        pendingDraggedTableRef.current = null;
      }
    }
  }

  return (
    <section className="space-y-4">
      <FloorPlanToolbar
        business={selectedBusiness}
        businesses={businesses}
        onBusinessChange={handleBusinessChange}
        onNewTable={() => setIsCreateModalOpen(true)}
        onResetPlan={handleResetPlan}
        onResetBackground={handleResetBackground}
        selectedBusinessId={selectedBusinessId}
        dataSourceLabel={dataSourceLabel}
      />

      <LocalBusinessWarning message={businessWarning} />

      <FloorPlanStats
        blocked={stats.blocked}
        occupied={stats.occupied}
        totalSeats={stats.totalSeats}
        totalTables={stats.totalTables}
        available={stats.available}
        unassignedReservations={stats.unassignedReservations}
      />

      <FloorPlanBackgroundControls
        background={background}
        backgroundEditMode={backgroundEditMode}
        isExpanded={isBackgroundControlsExpanded}
        canToggleExpanded={Boolean(background.backgroundImage)}
        onBackgroundImageChange={handleBackgroundImageChange}
        onBackgroundSettingChange={handleBackgroundSettingChange}
        onBackgroundDimensionChange={handleBackgroundDimensionChange}
        onResetBackground={handleResetBackground}
        onResetBackgroundTransform={handleResetBackgroundTransform}
        onToggleExpanded={() => setIsBackgroundControlsExpanded((current) => !current)}
        onToggleBackgroundEditMode={handleToggleBackgroundEditMode}
        isSupabase={isSupabaseDataSource}
      />

      <FloorPlanAvailabilityPanel
        slotOccupancy={slotOccupancy}
        onOpenAssignTable={(reservation) =>
          setSelectedReservationForAssignmentId(reservation.id)
        }
        debugInfo={
          SHOW_DEBUG && process.env.NODE_ENV !== "production"
            ? {
                selectedDate,
                selectedTime,
                reservationsLoaded,
                activeReservations: slotOccupancy.assignmentsByTableId
                  ? new Set(
                      Object.values(slotOccupancy.assignmentsByTableId)
                        .flat()
                        .map((reservation) => reservation.id),
                    ).size + slotOccupancy.reservationsWithoutTable.length
                  : 0,
                assignedReservationsForSelectedSlot: new Set(
                  Object.values(slotOccupancy.assignmentsByTableId)
                    .flat()
                    .map((reservation) => reservation.id),
                ).size,
                firstActiveReservationId:
                  Object.values(slotOccupancy.assignmentsByTableId).flat()[0]?.id ?? null,
              }
            : null
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <FloorPlanCanvas
          background={background}
          backgroundEditMode={backgroundEditMode}
          backgroundSelected={backgroundSelected}
          slotOccupancy={slotOccupancy}
          tables={tables}
          selectedTableId={selectedTableId}
          canvasRef={canvasRef}
          onSelectTable={(table) => setSelectedTableId(table.id)}
          onPointerDownTable={handlePointerDownTable}
          onResizePointerDownTable={handleTableResizePointerDown}
          onBackgroundPointerDown={handleBackgroundPointerDown}
          onBackgroundResizePointerDown={handleBackgroundResizePointerDown}
          isTableResizeMode={isTableResizeMode}
        />

        <FloorTableEditor
          key={selectedTable ? `${selectedTable.id}-${selectedTable.updatedAt}` : "empty"}
          table={selectedTable}
          isResizeMode={isTableResizeMode}
          onClose={() => {
            setSelectedTableId(null);
            setIsTableResizeMode(false);
          }}
          onDelete={handleDeleteTable}
          onSave={handleUpdateTable}
          onToggleResizeMode={handleToggleTableResizeMode}
        />
      </div>

      <FloorPlanOccupancyTimeline
        date={selectedDate}
        onDateChange={setSelectedDate}
        onTimeChange={setSelectedTime}
        slotOccupancy={slotOccupancy}
        timeline={timeline}
        selectedTime={selectedTime}
      />

      {feedback ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-cyan-400/20 bg-slate-950 px-4 py-2 text-sm text-cyan-100 shadow-2xl shadow-black/40">
          {feedback}
        </div>
      ) : null}

      {isCreateModalOpen ? (
        <FloorTableModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateTable}
        />
      ) : null}

      <ReservationTableAssignmentModal
        key={
          assignmentReservation?.id ?? "floor-plan-reservation-table-assignment-closed"
        }
        open={Boolean(assignmentReservation)}
        reservation={assignmentReservation}
        onAssigned={(message) => {
          setFeedback(message);
          setSelectedReservationForAssignmentId(null);
        }}
        onClose={() => setSelectedReservationForAssignmentId(null)}
      />
    </section>
  );
}
