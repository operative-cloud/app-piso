-- Relay cifrado: el servidor solo guarda blobs ilegibles. Sin datos personales.
create table if not exists public.dispositivos (
  hogar_id text not null,
  dispositivo_id text not null,
  creado_en timestamptz not null default now(),
  primary key (hogar_id, dispositivo_id)
);

create table if not exists public.eventos_cifrados (
  seq bigserial primary key,
  hogar_id text not null,
  dispositivo text not null,
  payload text not null check (length(payload) < 200000),
  creado_en timestamptz not null default now()
);
create index if not exists eventos_hogar_seq on public.eventos_cifrados (hogar_id, seq);

-- RLS activado SIN políticas: nadie accede a las tablas directamente, solo vía RPC.
alter table public.dispositivos enable row level security;
alter table public.eventos_cifrados enable row level security;

create or replace function public.registrar_dispositivo(p_hogar text, p_dispositivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from dispositivos where hogar_id = p_hogar and dispositivo_id = p_dispositivo) then return; end if;
  if (select count(*) from dispositivos where hogar_id = p_hogar) >= 2 then
    raise exception 'MAX_2';
  end if;
  insert into dispositivos values (p_hogar, p_dispositivo);
end $$;

create or replace function public.publicar_evento(p_hogar text, p_dispositivo text, p_payload text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from dispositivos where hogar_id = p_hogar and dispositivo_id = p_dispositivo) then
    raise exception 'NO_AUTORIZADO';
  end if;
  insert into eventos_cifrados (hogar_id, dispositivo, payload) values (p_hogar, p_dispositivo, p_payload);
end $$;

create or replace function public.leer_eventos(p_hogar text, p_dispositivo text, p_desde bigint)
returns table (seq bigint, dispositivo text, payload text)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from dispositivos d where d.hogar_id = p_hogar and d.dispositivo_id = p_dispositivo) then
    raise exception 'NO_AUTORIZADO';
  end if;
  return query select e.seq, e.dispositivo, e.payload from eventos_cifrados e
    where e.hogar_id = p_hogar and e.seq > p_desde order by e.seq limit 500;
end $$;

create or replace function public.borrar_hogar(p_hogar text, p_dispositivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from dispositivos where hogar_id = p_hogar and dispositivo_id = p_dispositivo) then
    raise exception 'NO_AUTORIZADO';
  end if;
  delete from eventos_cifrados where hogar_id = p_hogar;
  delete from dispositivos where hogar_id = p_hogar;
end $$;

revoke all on function public.registrar_dispositivo, public.publicar_evento, public.leer_eventos, public.borrar_hogar from public;
grant execute on function public.registrar_dispositivo, public.publicar_evento, public.leer_eventos, public.borrar_hogar to anon;
