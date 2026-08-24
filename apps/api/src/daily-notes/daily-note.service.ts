import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { DailyNote } from "../entities/daily-note.entity";

@Injectable()
export class DailyNoteService {
  constructor(
    @InjectRepository(DailyNote)
    private readonly notes: Repository<DailyNote>,
  ) {}

  list(workspaceId: string, from: string, to: string) {
    return this.notes.find({
      where: { workspaceId, date: Between(from, to) },
      order: { date: "ASC", createdAt: "ASC" },
    });
  }

  async create(
    workspaceId: string,
    date: string,
    content: string,
    userId: string,
  ) {
    const existing = await this.notes.findOneBy({ workspaceId, date });
    if (existing) {
      existing.content = content.trim();
      return this.notes.save(existing);
    }
    return this.notes.save(
      this.notes.create({
        workspaceId,
        date,
        content: content.trim(),
        createdBy: userId,
      }),
    );
  }

  async update(id: string, workspaceId: string, date: string, content: string) {
    const note = await this.notes.findOneBy({ id, workspaceId });
    if (!note) throw new NotFoundException();
    note.date = date;
    note.content = content.trim();
    return this.notes.save(note);
  }

  async remove(id: string, workspaceId: string) {
    const note = await this.notes.findOneBy({ id, workspaceId });
    if (!note) throw new NotFoundException();
    await this.notes.remove(note);
    return { id };
  }
}
